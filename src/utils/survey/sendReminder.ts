
/**
 * Validates an email address format
 * @param email The email address to validate
 * @returns Boolean indicating if the email is valid
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Parses and validates a list of comma-separated emails
 * @param emailString A comma-separated string of emails
 * @returns An object with valid emails array and invalid emails array
 */
export const validateEmails = (emailString: string): { 
  validEmails: string[], 
  invalidEmails: string[] 
} => {
  if (!emailString || emailString.trim() === '') {
    return { validEmails: [], invalidEmails: [] };
  }
  
  const emails = emailString
    .split(',')
    .map(email => email.trim())
    .filter(email => email !== '');
  
  const validEmails: string[] = [];
  const invalidEmails: string[] = [];
  
  emails.forEach(email => {
    if (isValidEmail(email)) {
      validEmails.push(email);
    } else {
      invalidEmails.push(email);
    }
  });
  
  return { validEmails, invalidEmails };
};
