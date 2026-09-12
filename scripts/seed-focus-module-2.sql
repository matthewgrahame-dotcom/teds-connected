INSERT INTO training_modules (program_id, title, module_type, content, sort_order)
SELECT id, 'M.A.T.C.H Price Match Training Module', 'quiz', 'M.A.T.C.H Price Match Training Module
Learner Instructions:
Knowledge Check Overview
This quiz is designed to assess your understanding of the M.A.T.C.H framework and your ability to
confidently handle price match enquiries and objections.
The questions focus on how you apply the framework in real customer interactions, including
identifying the right approach, communicating our value, and guiding customers toward the best
outcome.
You''ll need to demonstrate a strong, practical understanding of the material to successfully
complete this module. A score of 100% is required to pass.
Questionnaire:
Q1. What is the primary goal of a price match conversation at Ted''s?
A. To always offer the lowest price possible
B. To match competitors as quickly as possible
C. To guide the customer toward the best overall value and a confident purchase (correct)
D. To avoid losing margin at all costs

Q2. When a customer asks for a price match, what does it typically indicate?
A. They are not serious about buying
B. They are only interested in discounts
C. They have already decided to buy elsewhere
D. They are already interested and close to making a purchase (correct)

Q3. What is the purpose of the "A – Assess the Situation" step?
A. To immediately decide whether to match the price
B. To slow the conversation down, gather information, and verify details (correct)
C. To explain the Ted''s Difference
D. To offer a discount quickly

Q4. Why is it important to communicate our difference?
A. To shift the focus from price to overall value (correct)
B. To delay the conversation
C. To justify higher prices
D. To avoid answering the customer''s question

Q5. If a price match is not possible, what should you do?
A. End the conversation
B. Tell the customer to buy elsewhere
C. Ignore the customer''s request
D. Offer alternatives such as the best available price, bundles, or second-hand options (correct)

Scenario-Based Question
A customer comes into store and says:
"I''ve found this camera $200 cheaper online — can you match it?"
They seem fairly direct and are focused on getting the best price. They haven''t mentioned what they''ll be using the
camera for, and they haven''t asked about any accessories or additional products.

Question 1 (Text Input)
Using the M.A.T.C.H framework, what would you say or ask first to respond to this customer?

Question 2 (Text Input)
After assessing the situation, you determine that you cannot fully match the competitor''s price.
How would you respond to the customer to keep the conversation moving forward and maximise the chance of a
sale?', 1
FROM training_programs
WHERE title = 'FOCUS: Coaching in Real Time Training Module'
ORDER BY id DESC LIMIT 1;