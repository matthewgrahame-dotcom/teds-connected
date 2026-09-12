-- 1) Create the program
INSERT INTO training_programs (title, description, category, status, published_at)
VALUES (
  'FOCUS: Coaching in Real Time Training Module',
  'This course is designed to support you, as a store leader, with simple and consistent coaching tools you can use in the flow of the trading day. It will help you to: confidently observe sales behaviours aligned to the FOCUS framework, coach team members in short, high-impact moments, build capability and confidence without slowing down trade, and create a consistent coaching approach across all stores.

This course isn''t about telling you what "good" looks like -- you already know that. Instead, it''s about sharpening your ability to notice, reinforce, and course-correct FOCUS behaviours quickly, clearly, and confidently, even when time is limited.',
  'Sales Training',
  'live',
  now()
);

-- 2) Add its four modules, in order, pulling the new program's id by title
INSERT INTO training_modules (program_id, title, module_type, content, sort_order)
SELECT id, v.title, v.module_type, v.content, v.sort_order
FROM (VALUES
  ('FOCUS Module 1: The Coaching Mindset', 'lesson', 'Module 1 The Coaching Mindset
Building Capability Without Slowing You Down
Module Overview
Before we jump into coaching the FOCUS Sales Framework in real time, we first need to align on what
coaching is meant to do for you as a leader — not just for your team.
Learning Objectives
By the end of this module, you will be able to:
Recognise when coaching adds more value than stepping in
Distinguish clearly between managing tasks and coaching behaviours
Understand why behaviour-based coaching creates more consistent results
Apply a reinforcement-first coaching mindset that fits naturally into daily trade
Coach confidently without slowing the store or overthinking the moment
Section 1: Why Coaching Matters at Ted''s Cameras
In retail, it''s completely natural to jump in and fix issues that arrise quickly — especially when the store
is busy and customers are waiting.
That instinct keeps trade moving - but over time, it can unintentionally keep team member and store
performance dependent on you.
At Ted''s Cameras:
Our customers expect consistency, no matter who serves them
Consistency comes from shared behaviours, not individual heroics
Coaching is how leaders scale their impact across every interaction
Coaching doesn''t replace managing — it strengthens it:
Managing keeps the store running today.
Coaching builds a team that keeps it running tomorrow and into the future.
Section 2: Managing vs Coaching – Why Both Matter
Managing focuses on:
Floor coverage and priorities
Rostering and staff budgeting
Stock, accuracy and process
Resolving immediate issues
Managing keeps the business running — and it will always be essential.
Coaching focuses on:
Observing how interactions play out
Reinforcing behaviours that work
Refining one small improvement at a time
Improving future performance
Coaching isn''t about fixing everything at once, it''s about improving on going behaviours.
Key Distinction
Managing: "Did we hit target?" / "Let me step in" / Outcome-focused / Reactive
Coaching: "What behaviour influenced that result?" / "How can I help this team member do this next time?" / Behaviour-focused / Intentional
Both are valuable — but they serve different purposes.
Section 3: What Effective Coaching Looks Like in Real Life
Coaching is:
Short and focused
Based on what you actually observe
Specific to a behaviour (not a personality)
Mostly reinforcing what''s working
About setting the next interaction up for success
Coaching is not:
A performance review
A long conversation
A formal meeting
Waiting until something goes wrong
Taking over someone''s sale
The most effective coaching happens:
In between customer interactions
In 30-90 seconds
Often and consistently
Section 4: The 70 / 20 / 10 Coaching Balance
Strong teams grow faster when leaders notice what''s going right — not just what needs correction.
The Coaching Balance:
70% Reinforce effective behaviours
20% Refine small improvements
10% Correct behaviour gaps
Why this works:
Reinforcement builds confidence
Confident staff take ownership
Ownership creates consistency
Consistency delivers results
When feedback only shows up when something goes wrong, team members play it safe.
Reinforcement gives your team members clarity about "what good looks like" — and motivates them
to keep repeating it.
Section 5: Why Coaching Behaviour Drives Better Results
Sales results are important — but they are lag indicators. They tell us what already happened.
Coaching focuses on lead indicators - the behaviours that influence sales results.
The FOCUS Sales Framework gives leaders a shared language to coach the behaviours that create
results:
Speed and quality of greetings
Questioning and listening
Relevance of solutions
Value-led recommendations
Confidence at the close
When leaders coach behaviours:
Performance improves naturally
Results follow more consistently
Feedback feels supportive, not corrective
This makes coaching easier to deliver — and easier for teams to receive.
Section 6: Your Role as a FOCUS Coach
As a Ted''s Cameras leader, your role isn''t to coach everything — it''s to coach consistently.
You''re here to:
Notice FOCUS-aligned behaviours on the floor
Call out what''s working
Suggest small improvements when it matters (One at a time)
Send staff back to customers with confidence
You''re not expected to:
Catch every moment
Fix every issue
You are expected to:
Coach intentionally
Coach calmly
Coach often
Small moments of coaching, delivered consistently, are what separate good stores from great ones.
Attachments: Video (link not available in this export)', 0),
  ('M.A.T.C.H Price Match Training Module', 'quiz', 'M.A.T.C.H Price Match Training Module
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
sale?', 1),
  ('Module 2: The FOCUS Coaching Lens', 'lesson', 'Module 2: The FOCUS Coaching Lens
Learning Objectives
By the end of this module, you will be able to:
Use the FOCUS framework as a behaviour observation tool
Identify what "good looks like" for each FOCUS stage
Focus on one coachable behaviour at a time
Avoid assumption-based or outcome-based feedback
Prepare clean, confident coaching moments
Module Overview
Great coaching starts with great observation.
Many leaders feel confident giving feedback — but less confident deciding what to coach in the
moment. In a busy retail environment, trying to observe everything leads to unclear feedback and
missed opportunities.
This module introduces a structured way to observe specific, coachable behaviours during live
customer interactions, without disrupting trade.
Section 1: Observation Is the Foundation of Coaching
Coaching without clear observation leads to:
Vague feedback ("Just be more confident")
Assumptions ("They didn''t seem engaged")
Over-coaching ("Here''s everything you could''ve done better")
Effective coaching requires evidence — not interpretation.
You can only coach what you can clearly describe.
The FOCUS framework gives leaders a shared language to describe behaviours consistently across
all stores.
Section 2: Coaching Through the FOCUS Framework
FOCUS is not just a sales process — it''s a coaching structure.
Each step represents a set of observable behaviours, not personality traits or sales results.

F – First Impressions
What Leaders Observe: Speed of acknowledgement (within ~30 seconds); Eye contact and body language; Whether the team member pauses other tasks; Tone and warmth of greeting; Store readiness supporting the interaction
Coachable Behaviours: Acknowledging customers immediately; Using open, welcoming posture; Maintaining awareness of the floor
What NOT to Coach: "They seemed awkward"; "That customer didn''t look impressed"

O – Open Conversations
What Leaders Observe: Use of open-ended questions; Willingness to let the customer talk; Listening cues (nodding, paraphrasing); Avoidance of yes/no questions
Coachable Behaviours: Asking curiosity-led questions; Reflecting back understanding; Showing interest without rushing
What NOT to Coach: "You should be more curious"; "They didn''t seem engaged"

C – Customised Solutions
What Leaders Observe: Clear link between stated needs and recommendations; Use of benefit-led explanations; Limiting choice instead of overwhelming; Hands-on demonstrations
Coachable Behaviours: Repeating customer pain points; Translating features into real-world value; Using demos effectively
What NOT to Coach: "That wasn''t the right product"; "You should''ve sold them something else"

U – Upsell with Value
What Leaders Observe: Timing of add-on suggestions; Relevance to stated needs; Educational tone, not pressure; Introduction of Care Plans early
Coachable Behaviours: Framing add-ons as solutions; Linking accessories to use cases; Positioning Care Plans as protection
What NOT to Coach: "You forgot to upsell"; "That sale was too small"

S – Secure Satisfaction
What Leaders Observe: Confidence when asking for the sale; Clear closing language; Reassurance after commitment; Invitation back into the Ted''s ecosystem
Coachable Behaviours: Choosing the right close; Reinforcing purchase decisions; Highlighting ongoing support
What NOT to Coach: "They didn''t buy enough"; "You should''ve pushed harder"

Section 3: One Interaction = One Coaching Focus
Trying to coach multiple FOCUS steps in a single moment:
Confuses the team member
Dilutes the message
Reduces behaviour change
Coaching Rule: One interaction → One FOCUS behaviour
Even if you observe multiple opportunities, choose:
The most impactful
The most repeatable
The easiest to apply immediately
This keeps coaching clear, achievable, and effective.

Section 4: Avoiding Assumptions When Observing
Common trap: "That customer wasn''t interested."
Better coaching observation: "The team member asked three closed questions in a row."
Assumptions are emotional.
Behaviours are factual.
If you can''t describe it without emotion, you can''t coach it well.

Section 5: Preparing for Coaching Moments
Before approaching a team member, mentally check:
1. What did I actually see or hear?
2. Which FOCUS stage does this relate to?
3. Is this a reinforce or a refine moment?
If you can answer those three questions, you''re ready to coach — quickly and confidently.
Please select "Complete" to begin the knowledge checker quiz.', 2),
  ('Module 3: Micro-Coaching During Trading Hours', 'lesson', 'Module 3: Micro-Coaching During Trading Hours
Learning Objectives
By the end of this module, you will be able to:
Use a clear structure for short coaching moments
Deliver coaching that is focused, calm and effective
Reinforce or refine a FOCUS behaviour in real time
Avoid common mistakes that make coaching feel disruptive
Release team members back to the floor with confidence
Module Overview
One of the most common barriers to coaching in retail is time.
Leaders often feel they need:
A private space
A long conversation
The "right moment"
In reality, the most effective coaching at Ted''s Cameras happens between customers, not after shifts
or during sit-downs.
This module introduces a simple, repeatable micro-coaching model that allows leaders to coach
confidently in 30–90 seconds, without interrupting sales momentum or customer experience.

Section 1: Why Micro-Coaching Works in Retail
Retail doesn''t allow for perfect conditions — and coaching doesn''t need them.
Micro-coaching works because:
It happens close to the behaviour
Feedback is fresh and relevant
It feels supportive, not formal
It builds habits through repetition
Coaching that waits for "the right time" rarely happens.
Short, consistent coaching beats long, infrequent conversations every time.

Section 2: The SCAN – COACH – RELEASE Model
This three-step structure ensures coaching stays: Focused; Efficient; Effective

Step 1: SCAN (Observe One Thing)
Before speaking, get clear on one specific FOCUS behaviour you observed.
Examples: Speed of greeting (F); Question quality (O); Linking benefits to needs (C); Timing of an add-on (U); Confidence of the close (S)
Rule: One coaching moment = one behaviour.
This prevents overwhelm and increases behaviour change.

Step 2: COACH (30–90 Seconds)
Use this simple structure:
1. What you observed (fact)
2. Why it mattered (impact)
3. What to repeat or try next time (direction)
Keep it: Calm; Specific; Neutral in tone

Example – Reinforcement
"Quick one — I noticed you greeted that couple straight away and stopped what you were doing.
That helped them feel comfortable immediately. Keep doing that today — it sets you up for a much
stronger conversation."

Example – Refinement
"I noticed you explained the specs really well. Next time, try linking that feature back to what they
said about shooting their kids'' sport — it''ll land even better."

Step 3: RELEASE (Back to the Floor)
End coaching cleanly.
No extended discussion
No rehashing the full interaction
No stacking feedback
A simple finish: "Nice work — let''s keep it going."
This reinforces trust and momentum.

Section 3: Reinforce First, Refine Second
Most in-the-moment coaching should be reinforcement, not correction.
Why?
Reinforcement builds confidence
Confidence increases consistency
Consistency drives results
If a team member feels they only hear feedback when something goes wrong, they will avoid risk —
not improve.
Ask yourself before coaching: "What did they do well that I want to see again?"

Section 4: Coaching Location & Timing
Micro-coaching should:
Be near the floor, not hidden
Happen immediately or shortly after the interaction
Never occur in front of customers
Good moments include:
As the customer leaves
During natural breaks in traffic
While walking back to the counter together
Avoid:
Coaching mid-sale
Coaching when the team member is flustered
Turning coaching into a public correction

Section 5: What to Avoid When Micro-Coaching
Even short coaching can miss the mark if done poorly.
Common Pitfalls:
Coaching multiple behaviours at once
Using vague language ("Be more confident")
Asking "Why" questions
Turning coaching into a lecture
Holding team members too long
If it takes more than 90 seconds, it''s no longer micro-coaching.

Section 6: Building Confidence as a Coach
It''s normal to feel hesitant at first.
Remember:
You don''t need the perfect words
You''re coaching behaviours, not personalities
Your intent matters
Consistency matters more than polish.
The more often you coach, the more natural it becomes — for you and your team.
Please select "Complete" to begin the knowledge checker quiz.', 3)
) AS v(title, module_type, content, sort_order)
CROSS JOIN (SELECT id FROM training_programs WHERE title = 'FOCUS: Coaching in Real Time Training Module' ORDER BY id DESC LIMIT 1) AS p;
