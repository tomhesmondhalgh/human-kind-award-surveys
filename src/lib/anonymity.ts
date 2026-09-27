// Results for a survey (charts, free text, custom-question answers, exports)
// are only shown once this many people have responded, so that no individual
// can be identified from a small number of answers. The respondent intro text
// quotes this number, so change it here only.
export const MIN_RESPONSES_TO_SHOW_RESULTS = 5;

export const canShowResults = (responseCount: number): boolean =>
  Number.isFinite(responseCount) && responseCount >= MIN_RESPONSES_TO_SHOW_RESULTS;
