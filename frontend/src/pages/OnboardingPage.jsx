import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

const AGE_RANGES = [
  { value: 'under_18', label: 'Under 18' },
  { value: '18_24', label: '18–24' },
  { value: '25_34', label: '25–34' },
  { value: '35_44', label: '35–44' },
  { value: '45_plus', label: '45+' },
]

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { fetchUser } = useAuth()
  
  const [step, setStep] = useState(1)
  const [nickname, setNickname] = useState('')
  const [ageRange, setAgeRange] = useState('')
  const [availableTopics, setAvailableTopics] = useState([])
  const [selectedTopics, setSelectedTopics] = useState([])
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    api.get('/api/auth/topics/')
      .then(res => setAvailableTopics(res.data))
      .catch(err => console.error("Could not fetch topics:", err))
  }, [])

  const toggleTopic = (topicId) => {
    if (selectedTopics.includes(topicId)) {
      setSelectedTopics(selectedTopics.filter(id => id !== topicId))
    } else {
      if (selectedTopics.length < 3) {
        setSelectedTopics([...selectedTopics, topicId])
      }
    }
  }

  const handleNext = () => {
    if (step === 1 && !nickname.trim()) {
      setError("Please enter a nickname.")
      return
    }
    if (step === 2 && !ageRange) {
      setError("Please select your age range to continue.")
      return
    }
    setError(null)
    setStep(step + 1)
  }

  const handleSubmit = async () => {
    if (selectedTopics.length === 0) {
      setError("Please select at least one topic.")
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      await api.patch('/api/auth/me/', {
        nickname: nickname.trim(),
        age_range: ageRange,
        topic_ids: selectedTopics
      })
      await fetchUser() // Update context user so ProtectedRoute sees the age_range
      navigate('/chat')
    } catch (err) {
      setError("Failed to save your preferences. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div className="ui-shell flex min-h-screen items-center justify-center p-4">
      <div className="ui-card w-full max-w-lg p-8 sm:p-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#1f7a6a,#d97745)] text-xl font-bold text-white shadow-md">
            E
          </div>
          <h1 className="ui-section-title">Welcome to Exhale</h1>
          <p className="ui-subtitle mt-2">Let's personalize your private space.</p>
        </div>

        {error && <p className="ui-alert-error mb-6">{error}</p>}

        {step === 1 && (
          <div className="animate-fade-in">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">What should we call you?</h2>
            <div className="space-y-3">
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Enter your nickname"
                className="w-full rounded-[1.25rem] border border-black/10 p-4 text-slate-800 focus:border-[var(--brand-500)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-500)]"
              />
            </div>
            <button
              onClick={handleNext}
              className="ui-btn ui-btn-primary mt-8 w-full justify-center"
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">What is your age group?</h2>
            <div className="space-y-3">
              {AGE_RANGES.map(range => (
                <button
                  key={range.value}
                  onClick={() => setAgeRange(range.value)}
                  className={`block w-full rounded-[1.25rem] border p-4 text-left font-medium transition-all ${
                    ageRange === range.value
                      ? 'border-[var(--brand-500)] bg-[rgba(31,122,106,0.06)] text-slate-900 ring-1 ring-[var(--brand-500)]'
                      : 'border-black/5 bg-white text-slate-600 hover:border-black/10 hover:bg-slate-50'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="ui-btn ui-btn-secondary flex-1 justify-center"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                className="ui-btn ui-btn-primary flex-[2] justify-center"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in">
            <h2 className="mb-2 text-lg font-semibold text-slate-800">What emotions do you want to overcome or explore?</h2>
            <p className="mb-6 text-sm text-slate-500">Select up to 3 topics. This helps the AI understand what matters to you.</p>
            
            <div className="flex flex-wrap gap-3">
              {availableTopics.map(topic => {
                const isSelected = selectedTopics.includes(topic.id)
                return (
                  <button
                    key={topic.id}
                    onClick={() => toggleTopic(topic.id)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                      isSelected
                        ? 'border-[var(--brand-500)] bg-[var(--brand-500)] text-white shadow-md'
                        : 'border-black/10 bg-white text-slate-600 hover:border-black/20 hover:bg-slate-50'
                    } ${!isSelected && selectedTopics.length >= 3 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {topic.name}
                  </button>
                )
              })}
            </div>
            
            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="ui-btn ui-btn-secondary flex-1 justify-center"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading || selectedTopics.length === 0}
                className="ui-btn ui-btn-primary flex-[2] justify-center"
              >
                {isLoading ? 'Saving...' : 'Finish Setup'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
