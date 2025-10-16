-- Step 1: Drop the old constraint first
ALTER TABLE custom_questions 
DROP CONSTRAINT IF EXISTS custom_questions_type_check;

-- Step 2: Update any existing 'dropdown' records to 'multiple_choice'
UPDATE custom_questions 
SET type = 'multiple_choice' 
WHERE type = 'dropdown';

-- Step 3: Add new constraint allowing 'text' and 'multiple_choice' (matching frontend)
ALTER TABLE custom_questions 
ADD CONSTRAINT custom_questions_type_check 
CHECK (type = ANY (ARRAY['text'::text, 'multiple_choice'::text]));