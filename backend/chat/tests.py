from django.test import SimpleTestCase

from chat.services.llm_chat_service import (
    enforce_response_policy,
    is_deep_stage,
    is_existential_question,
    parse_response_policy,
    requires_meaningful_insight,
    should_send_cbt_followup,
)
from chat.graph.nodes import _detect_stage


class PromptRuleHelpersTests(SimpleTestCase):
    def test_detects_existential_question(self):
        self.assertTrue(is_existential_question("What's the point of trying if it always comes back?"))
        self.assertTrue(is_existential_question("What is the point anymore"))

    def test_non_existential_question_not_flagged(self):
        self.assertFalse(is_existential_question("Can you help me plan my day?"))

    def test_requires_insight_for_numbness_text(self):
        self.assertTrue(requires_meaningful_insight("I feel numb and disconnected lately", stage="general"))

    def test_requires_insight_for_hopelessness_and_self_doubt_stages(self):
        self.assertTrue(requires_meaningful_insight("I am not sure", stage="hopelessness"))
        self.assertTrue(requires_meaningful_insight("I am not sure", stage="self_doubt"))

    def test_general_state_without_trigger_does_not_require_insight(self):
        self.assertFalse(requires_meaningful_insight("I had a regular stressful day", stage="general"))


class DeepStageRuleTests(SimpleTestCase):
    def test_detects_deep_stages(self):
        self.assertTrue(is_deep_stage("burnout"))
        self.assertTrue(is_deep_stage("hopelessness"))
        self.assertFalse(is_deep_stage("general"))


class CbtFollowupGuardTests(SimpleTestCase):
    def test_skips_cbt_for_existential_message(self):
        self.assertFalse(
            should_send_cbt_followup(
                emotion="sad",
                is_crisis=False,
                stage="general",
                current_text="What's the point of trying anymore?",
            )
        )

    def test_skips_cbt_for_deep_stage(self):
        self.assertFalse(
            should_send_cbt_followup(
                emotion="sad",
                is_crisis=False,
                stage="hopelessness",
                current_text="I am feeling stuck and numb.",
            )
        )

    def test_allows_cbt_for_regular_sad_message(self):
        self.assertTrue(
            should_send_cbt_followup(
                emotion="sad",
                is_crisis=False,
                stage="general",
                current_text="I had a rough day and feel low.",
            )
        )

    def test_skips_cbt_when_no_extra_prompt_policy_enabled(self):
        self.assertFalse(
            should_send_cbt_followup(
                emotion="sad",
                is_crisis=False,
                stage="general",
                current_text="I had a rough day and feel low.",
                response_policy={"no_extra_prompt": True},
            )
        )


class ResponsePolicyTests(SimpleTestCase):
    def test_parse_policy_keeps_latest_directive(self):
        policy = parse_response_policy(
            "You can ask me a question now.",
            user_history_texts=["Please do not ask any question and no extra prompt."],
        )
        self.assertFalse(policy["no_question"])
        self.assertTrue(policy["no_extra_prompt"])

    def test_parse_policy_extracts_sentence_limit(self):
        policy = parse_response_policy("Reply in exactly 2 short sentences.")
        self.assertEqual(policy["max_sentences"], 2)

    def test_enforce_policy_removes_question_marks_and_limits_sentences(self):
        text = "I hear you. This is hard right now? We can handle it together."
        policy = {"no_question": True, "max_sentences": 2}
        output = enforce_response_policy(text, policy)
        self.assertEqual(output, "I hear you. This is hard right now.")


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
