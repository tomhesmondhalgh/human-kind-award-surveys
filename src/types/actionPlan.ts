
export type DescriptorStatus = 'Not Started' | 'In Progress' | 'Completed' | 'Blocked' | 'Not Applicable';

export interface ActionPlanTemplate {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ActionPlanDescriptor {
  id: string;
  user_id: string;
  organization_id?: string;
  section: string;
  reference: string;
  index_number: string;
  descriptor_text: string;
  status: DescriptorStatus;
  deadline?: string | null;
  assigned_to?: string | null;
  key_actions?: string | null;
  template_id?: string | null;
  progress_notes_count?: number;
}

export interface ProgressNote {
  id: string;
  descriptor_id: string;
  note_date: string;
  note_text: string;
  created_at: string;
}

export interface ActionPlanSection {
  title: string;
  key: string;
  descriptors: { reference: string; index_number: string; text: string; }[];
}

export const ACTION_PLAN_SECTIONS = [
  {
    key: 'leadership',
    title: 'Leadership',
    descriptors: [
      { reference: '1.1', index_number: '1.1', text: 'Leadership openly commits to using this framework and shares the plan with staff' },
      { reference: '1.2', index_number: '1.2', text: 'A lead member of staff and a lead governor is appointed for staff wellbeing. They are sufficiently knowledgeable and senior to effect organisational change.' },
      { reference: '1.3', index_number: '1.3', text: 'Staff wellbeing is explicitly addressed in policies, which are regularly reviewed. Staff are aware of where to find these and what they contain. ' },
      { reference: '1.4', index_number: '1.4', text: 'Staff are regularly consulted on issues relating to staff wellbeing, for example through a working party' },
      { reference: '1.5', index_number: '1.5', text: 'Staff wellbeing is included explicitly within improvement planning' },
      { reference: '1.6', index_number: '1.6', text: 'Leaders have effective methods in place to regularly monitor, review and continually improve the wellbeing of staff, in all its aspects' },
      { reference: '1.7', index_number: '1.7', text: 'Attendance and absence due to physical or mental health are regularly reviewed.  Trends are noted and acted upon in a manner that is supportive and non-judgemental to both individuals and the wider team.' },
      { reference: '1.8', index_number: '1.8', text: 'The organisation seeks external ideas and approaches relating to staff wellbeing and shares its successes with the wider sector' },
      { reference: '1.9', index_number: '1.9', text: 'Leaders role model how to prioritise wellbeing to their teams by following the guidance themselves' }
    ]
  },
  {
    key: 'workload',
    title: 'Workload',
    descriptors: [
      { reference: '2.1', index_number: '2.1', text: 'Workload is distributed fairly amongst staff, with support and scaffolding for less experienced members of the team.' },
      { reference: '2.2', index_number: '2.2', text: 'The impact on workload is considered in major decisions, with the impact of any changes on staff balanced against the needs of the organisation.' },
      { reference: '2.3', index_number: '2.3', text: 'Staff are proactive in suggesting solutions to workload challenges' },
      { reference: '2.4', index_number: '2.4', text: 'The utility of recurring tasks and meetings are regularly reviewed and unnecessary workload is dropped' },
      { reference: '2.5', index_number: '2.5', text: 'There are systems in place for recognising and responding to staff who are struggling or workload is deemed unreasonable' },
      { reference: '2.6', index_number: '2.6', text: 'There is a consistent system in place for reallocating and redistributing workload for absent staff in such a way that it does not disproportionately affect a small number of direct colleagues at short notice' },
      { reference: '2.7', index_number: '2.7', text: 'When staff take on new or additional roles or responsibilities, a workload review is conducted to ensure that workload expectations remain reasonable.  Action is taken to address any issues ahead of the new role commencing.' },
      { reference: '2.8', index_number: '2.8', text: 'The organisation takes opportunities to enable collaboration between staff' },
      { reference: '2.9', index_number: '2.9', text: 'Staff are given the opportunity to work flexibly, to an extent that this is compatible with their role and responsibilities' }
    ]
  },
  {
    key: 'life-work-balance',
    title: 'Life-Work Balance',
    descriptors: [
      { reference: '3.1', index_number: '3.1', text: 'Communication policies aim to enable staff to fully step away for an agreed minimum time each day and at the weekend. During the holidays, staff feel able to spend some time completely disconnected from work.' },
      { reference: '3.2', index_number: '3.2', text: 'There is flexibility/cover for staff to attend important family and personal events. Staff feel they are able to enjoy and focus on their own family as well as their role.' },
      { reference: '3.3', index_number: '3.3', text: 'Life-work balance is taken into account when planning the school calendar with consideration given to the timing and spacing of e.g. meetings, events, report writing and other deadlines.' },
      { reference: '3.4', index_number: '3.4', text: 'Supervision, reflective practice or other mechanisms for support and emotional offloading are in place which enable staff to hold appropriate boundaries when supporting the emotional wellbeing of others.' },
      { reference: '3.5', index_number: '3.5', text: 'New parents/carers are appropriately supported as they enter this new phase of their life and career and those caring for older or sick relatives are appropriately supported.' },
      { reference: '3.6', index_number: '3.6', text: 'All members of staff, including leaders, should be able to spot the early signs of burnout in each other and intervene accordingly.' },
      { reference: '3.7', index_number: '3.7', text: 'Internal and external meetings are scheduled at times that minimise disruption to staff\'s personal lives where possible.' },
      { reference: '3.8', index_number: '3.8', text: 'Staff recognise their role and responsibility in helping to maintain a life-work balance' }
    ]
  },
  {
    key: 'health',
    title: 'Health',
    descriptors: [
      { reference: '4.1', index_number: '4.1', text: 'Staff are able to take a lunch break and there are quiet spaces for staff where they can take uninterrupted breaks where possible.' },
      { reference: '4.2', index_number: '4.2', text: 'Staff understand the importance of diet, physical activity and sleep to their mental health and wellbeing.' },
      { reference: '4.3', index_number: '4.3', text: 'Times of high stress and challenge for the whole team are noted and appropriately responded to' },
      { reference: '4.4', index_number: '4.4', text: 'Times of high stress and challenge for individuals are noted and appropriately responded to' },
      { reference: '4.5', index_number: '4.5', text: 'Reasonable adjustments are made for staff who require them due to physical health, mental health or other reasons.  There is no stigma attached to accessing reasonable adjustments and leaders have appropriate training and/or access to appropriate support to tailor adjustments to well meet the needs of the individual.' }
    ]
  },
  {
    key: 'connection',
    title: 'Connection',
    descriptors: [
      { reference: '5.1', index_number: '5.1', text: 'The leadership communicate and embody the organisation\'s values and vision. The impact of this is demonstrated in staff\'s day-to-day actions and attitudes and enables consistent, positive shared decision-making.' },
      { reference: '5.2', index_number: '5.2', text: 'Mechanisms are in place to ensure that staff feel seen, heard and valued within their teams; all staff are warmly included regardless of hierarchy and every member of staff is part of a team.' },
      { reference: '5.3', index_number: '5.3', text: 'A range of skills, passions, experiences and attributes are drawn on, enabling staff to celebrate and lean into their individual strengths and passions' },
      { reference: '5.4', index_number: '5.4', text: 'Inclusion is taken seriously for staff.  For example, neurodivergent staff\'s needs are well met and LGBTQ+ staff thrive.' },
      { reference: '5.5', index_number: '5.5', text: 'Support, scaffolding and strategies are in place to enable all staff to contribute their ideas effectively. The opinions of quieter, less experienced or staff with communication barriers do not get neglected.' },
      { reference: '5.6', index_number: '5.6', text: 'The success of individuals, teams and the whole team are regularly noticed and celebrated. Care is taken to ensure that successes of all types and at all levels are celebrated and that no one\'s hard work goes unnoticed.' }
    ]
  },
  {
    key: 'support',
    title: 'Support',
    descriptors: [
      { reference: '6.1', index_number: '6.1', text: 'There is a culture of learning from mistakes in a nurturing manner as well as sharing best practice.' },
      { reference: '6.2', index_number: '6.2', text: 'Coaching, mentoring, reflective practice or supervision is established and utilised.' },
      { reference: '6.3', index_number: '6.3', text: 'There are effective referral pathways and signposting in place which address a variety of issues that staff may face.  These pathways are appropriately utilised and there is no associated stigma.' },
      { reference: '6.4', index_number: '6.4', text: 'Help-seeking is noted and celebrated as part of the culture.' },
      { reference: '6.5', index_number: '6.5', text: 'Line managers feel confident responding to disclosures from colleagues and have been trained in listening skills and next steps.' },
      { reference: '6.6', index_number: '6.6', text: 'Every member of the team has someone looking out for them and checking in with them, including all members of support teams and senior teams.' },
      { reference: '6.7', index_number: '6.7', text: 'Staff who are absent for longer periods due to mental or physical health are supported to keep in touch as appropriate and are well supported to transition back to work in a way that promotes their continued recovery and wellbeing. This is written into appropriate policies.' },
      { reference: '6.8', index_number: '6.8', text: 'Staff are trained in listening skills and conflict resolution so they can effectively identify challenges colleagues are facing and provide appropriate support' }
    ]
  },
  {
    key: 'growth',
    title: 'Growth',
    descriptors: [
      { reference: '7.1', index_number: '7.1', text: 'There is an effective programme of induction for every member of staff which covers their specific role, their wider responsibilities and shared expectations for working in line with the organisation\'s vision and values.' },
      { reference: '7.2', index_number: '7.2', text: 'Every member of staff has a job description which clearly outlines the requirements of their role including a full list of skills and knowledge needed to fulfil their responsibilities.' },
      { reference: '7.3', index_number: '7.3', text: 'Staff knowledge, skills, understanding and confidence are regularly, unjudgementally reviewed and steps are taken to address gaps with individuals, teams or the whole team.' },
      { reference: '7.4', index_number: '7.4', text: 'Low-stakes performance management systems that focus on development are in place.' },
      { reference: '7.5', index_number: '7.5', text: 'Staff are given regular access to high-quality CPD (this may take many forms) and have at least some influence over their professional development goals.' },
      { reference: '7.6', index_number: '7.6', text: 'Coaching, mentoring or buddying enables every member of staff to have at least one (internal or external) colleague with whom they can easily access to explore ideas or issues related to their role.' },
      { reference: '7.7', index_number: '7.7', text: 'There are strong mechanisms in place for the cascading of good ideas with a culture of cross-team sharing and training which is not exclusively facilitated and led by team leaders.' },
      { reference: '7.8', index_number: '7.8', text: 'Staff are given the opportunity to pursue areas of personal passion and interest and grow these within their role.' },
      { reference: '7.9', index_number: '7.9', text: 'Staff are proactively supported to aspire to other roles within (and beyond) the organisation if desired.' }
    ]
  },
  {
    key: 'values',
    title: 'Values',
    descriptors: [
      { reference: '8.1', index_number: '8.1', text: 'The organisation\'s values contain a commitment to staff wellbeing and providing an inclusive environment for all staff.' },
      { reference: '8.2', index_number: '8.2', text: 'These values are well understood and are reinforced regularly.' },
      { reference: '8.3', index_number: '8.3', text: 'Leaders model these values and the behaviour they expect from others when it comes to staff wellbeing.' },
      { reference: '8.4', index_number: '8.4', text: 'Staff wellbeing is seen as everyone\'s responsibility and staff are empowered to support each other.' }
    ]
  }
];
