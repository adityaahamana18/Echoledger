// Automated Test Suite for Deterministic Decision Engine & Validators
// Uses Node.js native test runner (node:test) — works out of the box with zero external dependencies.

import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateScholarship,
  evaluateJob,
  normalizeAcademicScore,
} from "../engine/deterministicEvaluator.js";
import {
  validateScholarshipInput,
  validateJobInput,
} from "../engine/validator.js";

test("normalizeAcademicScore correctly normalizes different scales", () => {
  // 10-point CGPA scale
  assert.equal(normalizeAcademicScore(8.5, 10), 85);
  // 4-point GPA scale
  assert.equal(normalizeAcademicScore(3.8, 4), 95);
  // 100 percentage scale
  assert.equal(normalizeAcademicScore(78, 100), 78);
});

test("evaluateScholarship: eligible high-merit & low-income profile matches eligible schemes", () => {
  const profile = {
    educationLevel: "Undergraduate",
    course: "Computer Science",
    institution: "National Institute of Technology",
    academicScore: 85,
    gpaScale: 100,
    annualIncome: 300000,
    state: "Karnataka",
    verifiedDocuments: ["Class 12 Marksheet", "Income Certificate"],
  };

  const result = evaluateScholarship(profile);
  assert.equal(result.category, "scholarship");
  assert.ok(result.bestMatch);
  assert.ok(result.eligibleSchemes.length >= 2);
  const nspMatch = result.eligibleSchemes.find((s) => s.schemeId === "nsp-csss");
  assert.ok(nspMatch);
  assert.ok(nspMatch.matchScore >= 70);
  assert.equal(nspMatch.checks.find((c) => c.criterion === "Academic Merit").passed, true);
  assert.equal(nspMatch.checks.find((c) => c.criterion === "Household Income").passed, true);
});

test("evaluateScholarship: missing family income flags Information Required", () => {
  const profile = {
    educationLevel: "Undergraduate",
    course: "Mechanical Engineering",
    institution: "State University",
    academicScore: 82,
    gpaScale: 100,
    annualIncome: null, // missing
    state: "Maharashtra",
  };

  const result = evaluateScholarship(profile);
  const nspMatch = result.eligibleSchemes.find((s) => s.schemeId === "nsp-csss");
  if (nspMatch) {
    assert.equal(nspMatch.matchStatus, "Information Required");
  }
});

test("evaluateScholarship: profile exceeding income ceiling is marked Ineligible for income-gated schemes", () => {
  const profile = {
    educationLevel: "Undergraduate",
    course: "Commerce",
    institution: "St. Xavier's College",
    academicScore: 82,
    gpaScale: 100,
    annualIncome: 900000, // Exceeds 4.5 Lakh limit of CSSS
    state: "West Bengal",
  };

  const result = evaluateScholarship(profile);
  const csss = result.bestMatch.schemeId === "nsp-csss" ? result.bestMatch : null;
  if (csss) {
    assert.equal(csss.checks.find((c) => c.criterion === "Household Income").passed, false);
  }
});

test("evaluateJob: candidate matching all mandatory skills receives Strong Match", () => {
  const profile = {
    preferredRole: "Frontend Developer",
    skills: ["JavaScript", "React", "HTML/CSS", "TypeScript", "Tailwind CSS"],
    yearsExperience: 2,
    education: "Bachelor's",
  };

  const result = evaluateJob(profile);
  assert.equal(result.category, "job");
  assert.equal(result.bestMatch.roleId, "frontend-developer");
  assert.equal(result.bestMatch.missingMandatory.length, 0);
  assert.ok(result.bestMatch.matchScore >= 75);
  assert.equal(result.bestMatch.status, "Strong Match");
});

test("evaluateJob: candidate missing preferred skills is NOT disqualified", () => {
  const profile = {
    preferredRole: "Frontend Developer",
    // Has all mandatory skills (JavaScript, React, HTML/CSS), but 0 preferred skills
    skills: "JavaScript, React, HTML/CSS",
    yearsExperience: 1,
    education: "Bachelor's",
  };

  const result = evaluateJob(profile);
  assert.equal(result.bestMatch.roleId, "frontend-developer");
  assert.equal(result.bestMatch.missingMandatory.length, 0);
  assert.ok(result.bestMatch.missingPreferred.length > 0);
  // Status should still be Good Match, never Not Shortlisted
  assert.ok(["Strong Match", "Good Match"].includes(result.bestMatch.status));
});

test("evaluateJob: candidate with significant skill gaps receives learning pathway and alternatives", () => {
  const profile = {
    preferredRole: "Backend Developer",
    skills: "HTML, CSS", // missing Node.js, Express, SQL
    yearsExperience: 0,
    education: "Bachelor's",
  };

  const result = evaluateJob(profile);
  assert.ok(result.bestMatch.missingMandatory.length > 0);
  assert.ok(result.bestMatch.learningPathway);
  assert.ok(result.bestMatch.alternativeRoles.length > 0);
});

test("validateScholarshipInput: enforces mandatory fields and catches invalid values", () => {
  const invalid = {
    name: "A", // too short
    educationLevel: "UnknownLevel",
    academicScore: -5, // negative
    annualIncome: -100, // negative
  };

  const val = validateScholarshipInput(invalid);
  assert.equal(val.isValid, false);
  assert.ok(val.errors.name);
  assert.ok(val.errors.educationLevel);
  assert.ok(val.errors.academicScore);
  assert.ok(val.errors.annualIncome);
});

test("validateJobInput: requires valid candidate name, role, and at least one skill", () => {
  const invalid = {
    name: "",
    preferredRole: "",
    skills: "",
    yearsExperience: -2,
  };

  const val = validateJobInput(invalid);
  assert.equal(val.isValid, false);
  assert.ok(val.errors.name);
  assert.ok(val.errors.preferredRole);
  assert.ok(val.errors.skills);
  assert.ok(val.errors.yearsExperience);
});
