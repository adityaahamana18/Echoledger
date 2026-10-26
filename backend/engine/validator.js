// Server-side Input Validator for EchoLedger Scholarship & Job Workflows
// Enforces strict schema, range, and privacy requirements.

export function validateScholarshipInput(payload) {
  const errors = {};
  const v = payload || {};

  // Name (for personalized report headline, stripped before AI processing)
  if (!v.name || typeof v.name !== "string" || v.name.trim().length < 2) {
    errors.name = "Applicant full name is required (minimum 2 characters).";
  }

  // Education Level
  const allowedLevels = ["High School", "Diploma", "Undergraduate", "Postgraduate", "PhD / Doctorate"];
  if (!v.educationLevel || !allowedLevels.includes(v.educationLevel)) {
    errors.educationLevel = `Select a valid education level (${allowedLevels.join(", ")}).`;
  }

  // Course / Field of Study
  if (!v.course || typeof v.course !== "string" || v.course.trim().length < 2) {
    errors.course = "Course or major is required to match scheme eligibility.";
  }

  // Institution
  if (!v.institution || typeof v.institution !== "string" || v.institution.trim().length < 2) {
    errors.institution = "Institution name is required to check accreditation.";
  }

  // Academic Marks / CGPA
  const scale = Number(v.gpaScale) || 10;
  const score = Number(v.academicScore);
  if (isNaN(score) || score <= 0) {
    errors.academicScore = "Enter a valid positive score or CGPA.";
  } else if (scale === 10 && (score < 0 || score > 10)) {
    errors.academicScore = "CGPA must be between 0 and 10 for a 10-point scale.";
  } else if (scale === 4 && (score < 0 || score > 4)) {
    errors.academicScore = "GPA must be between 0 and 4.0 for a 4-point scale.";
  } else if (scale === 100 && (score < 0 || score > 100)) {
    errors.academicScore = "Percentage must be between 0 and 100%.";
  }

  // Family Income (Annual)
  if (v.annualIncome !== undefined && v.annualIncome !== null && v.annualIncome !== "") {
    const inc = Number(v.annualIncome);
    if (isNaN(inc) || inc < 0) {
      errors.annualIncome = "Annual family income must be a non-negative number.";
    }
  }

  // State of Residence
  if (!v.state || typeof v.state !== "string" || v.state.trim().length < 2) {
    errors.state = "State of residence is required for regional / state quota validation.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateJobInput(payload) {
  const errors = {};
  const v = payload || {};

  // Name
  if (!v.name || typeof v.name !== "string" || v.name.trim().length < 2) {
    errors.name = "Candidate name is required (minimum 2 characters).";
  }

  // Preferred Role
  if (!v.preferredRole || typeof v.preferredRole !== "string" || v.preferredRole.trim().length < 2) {
    errors.preferredRole = "Preferred job role is required.";
  }

  // Skills
  if (!v.skills || (typeof v.skills !== "string" && !Array.isArray(v.skills))) {
    errors.skills = "List at least one core skill or technical capability.";
  } else {
    const skillList = Array.isArray(v.skills) ? v.skills : v.skills.split(",").map((s) => s.trim()).filter(Boolean);
    if (skillList.length === 0) {
      errors.skills = "Provide at least one verified skill.";
    }
  }

  // Years of Experience
  if (v.yearsExperience !== undefined && v.yearsExperience !== null && v.yearsExperience !== "") {
    const exp = Number(v.yearsExperience);
    if (isNaN(exp) || exp < 0 || exp > 50) {
      errors.yearsExperience = "Years of experience must be between 0 and 50.";
    }
  }

  // Highest Education
  const allowedDegrees = ["High School", "Diploma", "Bachelor's", "Master's", "PhD / Doctorate"];
  if (v.education && !allowedDegrees.includes(v.education)) {
    errors.education = `Select a recognized degree tier (${allowedDegrees.join(", ")}).`;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
