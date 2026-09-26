
import { ActionPlanDescriptor } from '../../types/actionPlan';

// Default action plan descriptors for new organizations
// These match the ACTION_PLAN_SECTIONS structure from actionPlan.ts
export const INITIAL_DESCRIPTORS: Omit<ActionPlanDescriptor, 'id' | 'user_id' | 'organization_id'>[] = [
  // Leadership section
  { section: 'leadership', index_number: '1.1', reference: '1.1', descriptor_text: 'Leadership openly commits to using this framework and shares the plan with staff', status: 'Not Started' },
  { section: 'leadership', index_number: '1.2', reference: '1.2', descriptor_text: 'A lead member of staff and a lead governor is appointed for staff wellbeing. They are sufficiently knowledgeable and senior to effect organisational change.', status: 'Not Started' },
  { section: 'leadership', index_number: '1.3', reference: '1.3', descriptor_text: 'Staff wellbeing is explicitly addressed in policies, which are regularly reviewed. Staff are aware of where to find these and what they contain. ', status: 'Not Started' },
  { section: 'leadership', index_number: '1.4', reference: '1.4', descriptor_text: 'Staff are regularly consulted on issues relating to staff wellbeing, for example through a working party', status: 'Not Started' },
  { section: 'leadership', index_number: '1.5', reference: '1.5', descriptor_text: 'Staff wellbeing is included explicitly within improvement planning', status: 'Not Started' },
  { section: 'leadership', index_number: '1.6', reference: '1.6', descriptor_text: 'Leaders have effective methods in place to regularly monitor, review and continually improve the wellbeing of staff, in all its aspects', status: 'Not Started' },
  { section: 'leadership', index_number: '1.7', reference: '1.7', descriptor_text: 'Attendance and absence due to physical or mental health are regularly reviewed.  Trends are noted and acted upon in a manner that is supportive and non-judgemental to both individuals and the wider team.', status: 'Not Started' },
  { section: 'leadership', index_number: '1.8', reference: '1.8', descriptor_text: 'The organisation seeks external ideas and approaches relating to staff wellbeing and shares its successes with the wider sector', status: 'Not Started' },
  { section: 'leadership', index_number: '1.9', reference: '1.9', descriptor_text: 'Leaders role model how to prioritise wellbeing to their teams by following the guidance themselves', status: 'Not Started' },
  
  // Workload section
  { section: 'workload', index_number: '2.1', reference: '2.1', descriptor_text: 'Workload is distributed fairly amongst staff, with support and scaffolding for less experienced members of the team.', status: 'Not Started' },
  { section: 'workload', index_number: '2.2', reference: '2.2', descriptor_text: 'The impact on workload is considered in major decisions, with the impact of any changes on staff balanced against the needs of the organisation.', status: 'Not Started' },
  { section: 'workload', index_number: '2.3', reference: '2.3', descriptor_text: 'Staff are proactive in suggesting solutions to workload challenges', status: 'Not Started' },
  { section: 'workload', index_number: '2.4', reference: '2.4', descriptor_text: 'The utility of recurring tasks and meetings are regularly reviewed and unnecessary workload is dropped', status: 'Not Started' },
  { section: 'workload', index_number: '2.5', reference: '2.5', descriptor_text: 'There are systems in place for recognising and responding to staff who are struggling or workload is deemed unreasonable', status: 'Not Started' },
  { section: 'workload', index_number: '2.6', reference: '2.6', descriptor_text: 'There is a consistent system in place for reallocating and redistributing workload for absent staff in such a way that it does not disproportionately affect a small number of direct colleagues at short notice', status: 'Not Started' },
  { section: 'workload', index_number: '2.7', reference: '2.7', descriptor_text: 'When staff take on new or additional roles or responsibilities, a workload review is conducted to ensure that workload expectations remain reasonable.  Action is taken to address any issues ahead of the new role commencing.', status: 'Not Started' },
  { section: 'workload', index_number: '2.8', reference: '2.8', descriptor_text: 'The organisation takes opportunities to enable collaboration between staff', status: 'Not Started' },
  { section: 'workload', index_number: '2.9', reference: '2.9', descriptor_text: 'Staff are given the opportunity to work flexibly, to an extent that this is compatible with their role and responsibilities', status: 'Not Started' },
  
  // Life-Work Balance section
  { section: 'life-work-balance', index_number: '3.1', reference: '3.1', descriptor_text: 'Communication policies aim to enable staff to fully step away for an agreed minimum time each day and at the weekend. During the holidays, staff feel able to spend some time completely disconnected from work.', status: 'Not Started' },
  { section: 'life-work-balance', index_number: '3.2', reference: '3.2', descriptor_text: 'There is flexibility/cover for staff to attend important family and personal events. Staff feel they are able to enjoy and focus on their own family as well as their role.', status: 'Not Started' },
  { section: 'life-work-balance', index_number: '3.3', reference: '3.3', descriptor_text: 'Life-work balance is taken into account when planning the school calendar with consideration given to the timing and spacing of e.g. meetings, events, report writing and other deadlines.', status: 'Not Started' },
  { section: 'life-work-balance', index_number: '3.4', reference: '3.4', descriptor_text: 'Supervision, reflective practice or other mechanisms for support and emotional offloading are in place which enable staff to hold appropriate boundaries when supporting the emotional wellbeing of others.', status: 'Not Started' },
  { section: 'life-work-balance', index_number: '3.5', reference: '3.5', descriptor_text: 'New parents/carers are appropriately supported as they enter this new phase of their life and career and those caring for older or sick relatives are appropriately supported.', status: 'Not Started' },
  { section: 'life-work-balance', index_number: '3.6', reference: '3.6', descriptor_text: 'All members of staff, including leaders, should be able to spot the early signs of burnout in each other and intervene accordingly.', status: 'Not Started' },
  { section: 'life-work-balance', index_number: '3.7', reference: '3.7', descriptor_text: 'Internal and external meetings are scheduled at times that minimise disruption to staff\'s personal lives where possible.', status: 'Not Started' },
  { section: 'life-work-balance', index_number: '3.8', reference: '3.8', descriptor_text: 'Staff recognise their role and responsibility in helping to maintain a life-work balance', status: 'Not Started' },
  
  // Health section
  { section: 'health', index_number: '4.1', reference: '4.1', descriptor_text: 'Staff are able to take a lunch break and there are quiet spaces for staff where they can take uninterrupted breaks where possible.', status: 'Not Started' },
  { section: 'health', index_number: '4.2', reference: '4.2', descriptor_text: 'Staff understand the importance of diet, physical activity and sleep to their mental health and wellbeing.', status: 'Not Started' },
  { section: 'health', index_number: '4.3', reference: '4.3', descriptor_text: 'Times of high stress and challenge for the whole team are noted and appropriately responded to', status: 'Not Started' },
  { section: 'health', index_number: '4.4', reference: '4.4', descriptor_text: 'Times of high stress and challenge for individuals are noted and appropriately responded to', status: 'Not Started' },
  { section: 'health', index_number: '4.5', reference: '4.5', descriptor_text: 'Reasonable adjustments are made for staff who require them due to physical health, mental health or other reasons.  There is no stigma attached to accessing reasonable adjustments and leaders have appropriate training and/or access to appropriate support to tailor adjustments to well meet the needs of the individual.', status: 'Not Started' },
  
  // Connection section
  { section: 'connection', index_number: '5.1', reference: '5.1', descriptor_text: 'The leadership communicate and embody the organisation\'s values and vision. The impact of this is demonstrated in staff\'s day-to-day actions and attitudes and enables consistent, positive shared decision-making.', status: 'Not Started' },
  { section: 'connection', index_number: '5.2', reference: '5.2', descriptor_text: 'Mechanisms are in place to ensure that staff feel seen, heard and valued within their teams; all staff are warmly included regardless of hierarchy and every member of staff is part of a team.', status: 'Not Started' },
  { section: 'connection', index_number: '5.3', reference: '5.3', descriptor_text: 'A range of skills, passions, experiences and attributes are drawn on, enabling staff to celebrate and lean into their individual strengths and passions', status: 'Not Started' },
  { section: 'connection', index_number: '5.4', reference: '5.4', descriptor_text: 'Inclusion is taken seriously for staff.  For example, neurodivergent staff\'s needs are well met and LGBTQ+ staff thrive.', status: 'Not Started' },
  { section: 'connection', index_number: '5.5', reference: '5.5', descriptor_text: 'Support, scaffolding and strategies are in place to enable all staff to contribute their ideas effectively. The opinions of quieter, less experienced or staff with communication barriers do not get neglected.', status: 'Not Started' },
  { section: 'connection', index_number: '5.6', reference: '5.6', descriptor_text: 'The success of individuals, teams and the whole team are regularly noticed and celebrated. Care is taken to ensure that successes of all types and at all levels are celebrated and that no one\'s hard work goes unnoticed.', status: 'Not Started' },
  
  // Support section
  { section: 'support', index_number: '6.1', reference: '6.1', descriptor_text: 'There is a culture of learning from mistakes in a nurturing manner as well as sharing best practice.', status: 'Not Started' },
  { section: 'support', index_number: '6.2', reference: '6.2', descriptor_text: 'Coaching, mentoring, reflective practice or supervision is established and utilised.', status: 'Not Started' },
  { section: 'support', index_number: '6.3', reference: '6.3', descriptor_text: 'There are effective referral pathways and signposting in place which address a variety of issues that staff may face.  These pathways are appropriately utilised and there is no associated stigma.', status: 'Not Started' },
  { section: 'support', index_number: '6.4', reference: '6.4', descriptor_text: 'Help-seeking is noted and celebrated as part of the culture.', status: 'Not Started' },
  { section: 'support', index_number: '6.5', reference: '6.5', descriptor_text: 'Line managers feel confident responding to disclosures from colleagues and have been trained in listening skills and next steps.', status: 'Not Started' },
  { section: 'support', index_number: '6.6', reference: '6.6', descriptor_text: 'Every member of the team has someone looking out for them and checking in with them, including all members of support teams and senior teams.', status: 'Not Started' },
  { section: 'support', index_number: '6.7', reference: '6.7', descriptor_text: 'Staff who are absent for longer periods due to mental or physical health are supported to keep in touch as appropriate and are well supported to transition back to work in a way that promotes their continued recovery and wellbeing. This is written into appropriate policies.', status: 'Not Started' },
  { section: 'support', index_number: '6.8', reference: '6.8', descriptor_text: 'Staff are trained in listening skills and conflict resolution so they can effectively identify challenges colleagues are facing and provide appropriate support', status: 'Not Started' },
  
  // Growth section
  { section: 'growth', index_number: '7.1', reference: '7.1', descriptor_text: 'There is an effective programme of induction for every member of staff which covers their specific role, their wider responsibilities and shared expectations for working in line with the organisation\'s vision and values.', status: 'Not Started' },
  { section: 'growth', index_number: '7.2', reference: '7.2', descriptor_text: 'Every member of staff has a job description which clearly outlines the requirements of their role including a full list of skills and knowledge needed to fulfil their responsibilities.', status: 'Not Started' },
  { section: 'growth', index_number: '7.3', reference: '7.3', descriptor_text: 'Staff knowledge, skills, understanding and confidence are regularly, unjudgementally reviewed and steps are taken to address gaps with individuals, teams or the whole team.', status: 'Not Started' },
  { section: 'growth', index_number: '7.4', reference: '7.4', descriptor_text: 'Low-stakes performance management systems that focus on development are in place.', status: 'Not Started' },
  { section: 'growth', index_number: '7.5', reference: '7.5', descriptor_text: 'Staff are given regular access to high-quality CPD (this may take many forms) and have at least some influence over their professional development goals.', status: 'Not Started' },
  { section: 'growth', index_number: '7.6', reference: '7.6', descriptor_text: 'Coaching, mentoring or buddying enables every member of staff to have at least one (internal or external) colleague with whom they can easily access to explore ideas or issues related to their role.', status: 'Not Started' },
  { section: 'growth', index_number: '7.7', reference: '7.7', descriptor_text: 'There are strong mechanisms in place for the cascading of good ideas with a culture of cross-team sharing and training which is not exclusively facilitated and led by team leaders.', status: 'Not Started' },
  { section: 'growth', index_number: '7.8', reference: '7.8', descriptor_text: 'Staff are given the opportunity to pursue areas of personal passion and interest and grow these within their role.', status: 'Not Started' },
  { section: 'growth', index_number: '7.9', reference: '7.9', descriptor_text: 'Staff are proactively supported to aspire to other roles within (and beyond) the organisation if desired.', status: 'Not Started' },
  
  // Values section
  { section: 'values', index_number: '8.1', reference: '8.1', descriptor_text: 'The organisation\'s values contain a commitment to staff wellbeing and providing an inclusive environment for all staff.', status: 'Not Started' },
  { section: 'values', index_number: '8.2', reference: '8.2', descriptor_text: 'These values are well understood and are reinforced regularly.', status: 'Not Started' },
  { section: 'values', index_number: '8.3', reference: '8.3', descriptor_text: 'Leaders model these values and the behaviour they expect from others when it comes to staff wellbeing.', status: 'Not Started' },
  { section: 'values', index_number: '8.4', reference: '8.4', descriptor_text: 'Staff wellbeing is seen as everyone\'s responsibility and staff are empowered to support each other.', status: 'Not Started' }
];
