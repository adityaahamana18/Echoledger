// Integration Test Suite for Scholarship & Job Workflows
import test from "node:test";
import assert from "node:assert/strict";
import { evaluateScholarship, evaluateJob } from "../engine/deterministicEvaluator.js";
import { validateScholarshipInput, validateJobInput } from "../engine/validator.js";

test("Integration: Student with 3.9/4.0 GPA evaluated for scholarships", () => {
  const profile = {
    name: "Sneha Reddy",
    educationLevel: "Undergraduate",
    course: "Physics",
    institution: "St. Stephen's College",
    academicScore: 3.9,
    gpaScale: 4, // 4-point scale -> 97.5%
    annualIncome: 200000,
    state: "Delhi",
    verifiedDocuments: ["Class 10 / 12 Marksheet & Passing Certificate"],
  };

  const validation = validateScholarshipInput(profile);
  assert.equal(validation.isValid, true);

  const evaluation = evaluateScholarship(profile);
  assert.equal(evaluation.applicantProfile.academicPercentage, 97.5);
  assert.ok(evaluation.eligibleSchemes.length > 0);
  assert.equal(evaluation.deterministicOutcome, "Potential Match"); // Needs all documents for confirmed
});

test("Integration: Student / Intern with 0 years experience applying for SE Intern", () => {
  const profile = {
    name: "Aman Gupta",
    preferredRole: "Software Engineering Intern",
    skills: "Programming Fundamentals, Data Structures, Git, Python",
    yearsExperience: 0,
    education: "Bachelor's",
  };

  const validation = validateJobInput(profile);
  assert.equal(validation.isValid, true);

  const evaluation = evaluateJob(profile);
  assert.equal(evaluation.bestMatch.roleId, "software-engineering-intern");
  assert.equal(evaluation.bestMatch.experienceSuitability, "Sufficient Experience");
  assert.ok(["Strong Match", "Good Match"].includes(evaluation.bestMatch.status));
});

test("Integration: Candidate with frontend skills applying for backend gets routed to best match with alternative", () => {
  const profile = {
    name: "Rohan Sen",
    preferredRole: "Backend Developer",
    skills: "React, CSS, HTML, JavaScript", // frontend skills
    yearsExperience: 1,
    education: "Bachelor's",
  };

  const evaluation = evaluateJob(profile);
  // Engine accurately finds Frontend Developer as best match based on verified skills
  assert.equal(evaluation.bestMatch.roleId, "frontend-developer");
  assert.ok(["Strong Match", "Good Match"].includes(evaluation.bestMatch.status));
  // And identifies alternative roles
  assert.ok(evaluation.alternatives.length > 0);
});

test("Integration: Malformed and boundary inputs handled safely", () => {
  const badScholarship = {
    name: "   ",
    educationLevel: "InvalidLevel",
    academicScore: "not-a-number",
  };
  const valSch = validateScholarshipInput(badScholarship);
  assert.equal(valSch.isValid, false);

  const badJob = {
    name: "",
    preferredRole: "",
    skills: [],
    yearsExperience: 999, // out of range
  };
  const valJob = validateJobInput(badJob);
  assert.equal(valJob.isValid, false);
});
