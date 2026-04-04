from django.test import SimpleTestCase

from chat.graph.nodes import _detect_stage
from chat.services.llm_chat_service import enforce_crisis_safety, is_existential_question


class PromptRuleHelpersTests(SimpleTestCase):
    def test_detects_existential_question(self):
        self.assertTrue(is_existential_question("What's the point of trying if it always comes back?"))
        self.assertTrue(is_existential_question("What is the point anymore"))

    def test_non_existential_question_not_flagged(self):
        self.assertFalse(is_existential_question("Can you help me plan my day?"))


class CrisisSafetyTests(SimpleTestCase):
    def test_removes_probing_question_and_unsafe_terms(self):
        raw = "I hear you, sweetheart. What triggered this? You matter and support is available."
        output = enforce_crisis_safety(raw)
        self.assertNotIn("what triggered", output.lower())
        self.assertNotIn("sweetheart", output.lower())


class StageDetectionTests(SimpleTestCase):
    def test_detects_burnout_for_small_tasks_heavy_phrase(self):
        stage = _detect_stage("Yeah, and even small tasks feel heavy lately.", emotion="sad")
        self.assertEqual(stage, "burnout")

    def test_detects_burnout_for_mentally_tired_phrase(self):
        stage = _detect_stage("I have been mentally tired and it is hard to focus.", emotion="sad")
        self.assertEqual(stage, "burnout")

    def test_deep_heuristic_should_override_shallow_model_stage(self):
        model_stage = "general"
        heuristic_stage = _detect_stage("Yeah, and even small tasks feel heavy lately.", emotion="sad")
        final_stage = heuristic_stage if heuristic_stage in {"burnout", "hopelessness"} and model_stage not in {"burnout", "hopelessness"} else model_stage
        self.assertEqual(final_stage, "burnout")
