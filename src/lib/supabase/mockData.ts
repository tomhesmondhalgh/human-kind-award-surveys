
import { ActionPlanDescriptor } from '../../types/actionPlan';

// Default action plan descriptors for new organizations
export const INITIAL_DESCRIPTORS: Omit<ActionPlanDescriptor, 'id' | 'user_id' | 'organization_id'>[] = [
  {
    section: 'leadership',
    index_number: '1.1',
    reference: 'L1.1',
    descriptor_text: 'Leadership demonstrates clear commitment to staff wellbeing through policies and actions.',
    status: 'Not Started'
  },
  {
    section: 'leadership',
    index_number: '1.2',
    reference: 'L1.2',
    descriptor_text: 'Regular communication channels exist between leadership and staff regarding wellbeing matters.',
    status: 'Not Started'
  },
  {
    section: 'staff_wellbeing',
    index_number: '2.1',
    reference: 'SW2.1',
    descriptor_text: 'Comprehensive support systems are in place for staff mental health and wellbeing.',
    status: 'Not Started'
  },
  {
    section: 'staff_wellbeing',
    index_number: '2.2',
    reference: 'SW2.2',
    descriptor_text: 'Staff have access to appropriate resources and training on wellbeing topics.',
    status: 'Not Started'
  },
  {
    section: 'workload_management',
    index_number: '3.1',
    reference: 'WM3.1',
    descriptor_text: 'Workload monitoring systems are implemented to ensure sustainable working patterns.',
    status: 'Not Started'
  },
  {
    section: 'workload_management',
    index_number: '3.2',
    reference: 'WM3.2',
    descriptor_text: 'Clear boundaries exist for reasonable working hours and expectations.',
    status: 'Not Started'
  },
  {
    section: 'professional_development',
    index_number: '4.1',
    reference: 'PD4.1',
    descriptor_text: 'Opportunities for professional growth and development are regularly available.',
    status: 'Not Started'
  },
  {
    section: 'professional_development',
    index_number: '4.2',
    reference: 'PD4.2',
    descriptor_text: 'Career progression pathways are clearly defined and communicated.',
    status: 'Not Started'
  },
  {
    section: 'communication',
    index_number: '5.1',
    reference: 'C5.1',
    descriptor_text: 'Open and transparent communication channels exist at all organisational levels.',
    status: 'Not Started'
  },
  {
    section: 'communication',
    index_number: '5.2',
    reference: 'C5.2',
    descriptor_text: 'Regular feedback mechanisms allow staff to contribute to organisational decisions.',
    status: 'Not Started'
  },
  {
    section: 'policies_procedures',
    index_number: '6.1',
    reference: 'PP6.1',
    descriptor_text: 'Wellbeing policies are clearly documented and regularly reviewed.',
    status: 'Not Started'
  },
  {
    section: 'policies_procedures',
    index_number: '6.2',
    reference: 'PP6.2',
    descriptor_text: 'Procedures for addressing wellbeing concerns are well-established and accessible.',
    status: 'Not Started'
  }
];
