// Deterministic Decision Engine for EchoLedger
// Performs strict rule checking, qualification scoring, skill gap analysis, and alternative ranking.
// Language models reason over this deterministic output and cannot alter factual criteria.

import { SCHOLARSHIPS } from "../data/scholarships.js";
import { JOB_ROLES } from "../data/jobs.js";

// Helper to normalize academic scores to a standard 0-100 percentage
export function normalizeAcademicScore(score, scale = 10) {
  const numericScore = Number(score) || 0;
  const numericScale = Number(scale) || 10;
  if (numericScale === 4) return (numericScore / 4) * 100;
  if (numericScale === 10) return numericScore * 10;
  return Math.min(100, Math.max(0, numericScore));
}

// ── Scholarship Evaluator ───────────────────────────────────────────────────

export function evaluateScholarship(profile) {
  const percentage = normalizeAcademicScore(profile.academicScore, profile.gpaScale);
  const income = profile.annualIncome !== undefined && profile.annualIncome !== null && profile.annualIncome !== ""
    ? Number(profile.annualIncome)
    : null;
  const educationLevel = profile.educationLevel || "Undergraduate";
  const verifiedDocs = Array.isArray(profile.verifiedDocuments) ? profile.verifiedDocuments : [];

  const evaluatedSchemes = SCHOLARSHIPS.map((scheme) => {
    const checks = [];
    let isEligible = true;
    let missingInfo = false;

    // 1. Level check
    const levelMatch = scheme.level.some((lvl) => lvl.toLowerCase() === educationLevel.toLowerCase());
    checks.push({
      criterion: "Education Level",
      required: scheme.level.join(" or "),
      actual: educationLevel,
      passed: levelMatch,
      status: levelMatch ? "Met" : "Unmet",
    });
    if (!levelMatch) isEligible = false;

    // 2. Academic score check
    const marksPassed = percentage >= scheme.minMarksPercentage;
    checks.push({
      criterion: "Academic Merit",
      required: `Minimum ${scheme.minMarksPercentage}% (or equivalent CGPA)`,
      actual: `${percentage.toFixed(1)}% equivalent`,
      passed: marksPassed,
      status: marksPassed ? "Met" : "Below Threshold",
    });
    if (!marksPassed) isEligible = false;

    // 3. Family income check
    let incomePassed = true;
    if (scheme.maxFamilyIncome !== null) {
      if (income === null) {
        missingInfo = true;
        checks.push({
          criterion: "Household Income",
          required: `Below ₹${scheme.maxFamilyIncome.toLocaleString("en-IN")}/yr`,
          actual: "Not specified",
          passed: false,
          status: "Information Required",
        });
      } else {
        incomePassed = income <= scheme.maxFamilyIncome;
        checks.push({
          criterion: "Household Income",
          required: `Below ₹${scheme.maxFamilyIncome.toLocaleString("en-IN")}/yr`,
          actual: `₹${income.toLocaleString("en-IN")}/yr`,
          passed: incomePassed,
          status: incomePassed ? "Met" : "Exceeds Ceiling",
        });
        if (!incomePassed) isEligible = false;
      }
    } else {
      checks.push({
        criterion: "Household Income",
        required: "No income ceiling (Merit-based)",
        actual: income !== null ? `₹${income.toLocaleString("en-IN")}/yr` : "N/A",
        passed: true,
        status: "Met",
      });
    }

    // 4. Document verification status
    const verifiedRequiredDocs = scheme.documentsRequired.filter((d) =>
      verifiedDocs.some((vd) => vd.toLowerCase().includes(d.toLowerCase().slice(0, 10)))
    );
    const hasAllDocs = verifiedRequiredDocs.length === scheme.documentsRequired.length;

    // Determine status
    let matchStatus = "Ineligible";
    if (isEligible && !missingInfo) {
      matchStatus = hasAllDocs ? "Confirmed Eligible" : "Potential Match";
    } else if (missingInfo && marksPassed && levelMatch) {
      matchStatus = "Information Required";
    }

    // Calculate score (0 - 100)
    let matchScore = 0;
    if (levelMatch) matchScore += 25;
    if (marksPassed) {
      matchScore += Math.min(50, 30 + (percentage - scheme.minMarksPercentage) * 1.5);
    }
    if (incomePassed && income !== null) matchScore += 25;

    return {
      schemeId: scheme.id,
      schemeName: scheme.name,
      provider: scheme.provider,
      officialUrl: scheme.officialUrl,
      provenance: scheme.provenance,
      awardAmount: scheme.awardAmount,
      matchStatus,
      matchScore: Math.round(matchScore),
      checks,
      mandatoryRequirements: scheme.mandatoryRequirements,
      documentsRequired: scheme.documentsRequired,
      verifiedDocsCount: verifiedRequiredDocs.length,
    };
  });

  // Sort: Best matches first
  evaluatedSchemes.sort((a, b) => b.matchScore - a.matchScore);

  const bestMatch = evaluatedSchemes[0];
  const eligibleSchemes = evaluatedSchemes.filter((s) => s.matchStatus === "Confirmed Eligible" || s.matchStatus === "Potential Match");
  const alternatives = evaluatedSchemes.filter((s) => s.schemeId !== bestMatch?.schemeId && s.matchScore >= 40);

  return {
    category: "scholarship",
    applicantProfile: {
      educationLevel,
      course: profile.course,
      institution: profile.institution,
      academicPercentage: Number(percentage.toFixed(1)),
      annualIncome: income,
      state: profile.state,
    },
    bestMatch,
    eligibleSchemes,
    alternatives: alternatives.slice(0, 3),
    deterministicOutcome: bestMatch?.matchStatus === "Confirmed Eligible"
      ? "Award Recommended"
      : bestMatch?.matchStatus === "Potential Match"
      ? "Potential Match"
      : bestMatch?.matchStatus === "Information Required"
      ? "Documentation Required"
      : "Alternative Pathways Recommended",
    confidence: bestMatch ? Math.max(50, Math.min(96, bestMatch.matchScore)) : 60,
  };
}

// ── Job Evaluator ───────────────────────────────────────────────────────────

export function evaluateJob(profile) {
  const preferredRole = (profile.preferredRole || "").toLowerCase();
  const rawSkills = Array.isArray(profile.skills)
    ? profile.skills
    : (profile.skills || "").split(",").map((s) => s.trim()).filter(Boolean);
  const normalizedUserSkills = rawSkills.map((s) => s.toLowerCase());
  const yearsExperience = Number(profile.yearsExperience) || 0;
  const education = profile.education || "Bachelor's";

  const evaluatedRoles = JOB_ROLES.map((role) => {
    // Check mandatory skills
    const matchingMandatory = role.mandatorySkills.filter((ms) =>
      normalizedUserSkills.some((us) => us.includes(ms.toLowerCase()) || ms.toLowerCase().includes(us))
    );
    const missingMandatory = role.mandatorySkills.filter(
      (ms) => !matchingMandatory.includes(ms)
    );

    // Check preferred skills
    const matchingPreferred = role.preferredSkills.filter((ps) =>
      normalizedUserSkills.some((us) => us.includes(ps.toLowerCase()) || ps.toLowerCase().includes(us))
    );
    const missingPreferred = role.preferredSkills.filter(
      (ps) => !matchingPreferred.includes(ps)
    );

    // Experience check
    const expPassed = yearsExperience >= role.minYearsExperience;
    const roleTitleMatch = preferredRole.includes(role.title.toLowerCase()) || role.title.toLowerCase().includes(preferredRole);

    // Score calculation
    // Mandatory skills weight: 50%
    const mandatoryRatio = matchingMandatory.length / Math.max(1, role.mandatorySkills.length);
    const mandatoryScore = mandatoryRatio * 50;

    // Preferred skills weight: 30%
    const preferredRatio = matchingPreferred.length / Math.max(1, role.preferredSkills.length);
    const preferredScore = preferredRatio * 30;

    // Experience & Role preference weight: 20%
    const expScore = expPassed ? 10 : Math.max(0, 10 - (role.minYearsExperience - yearsExperience) * 4);
    const prefScore = roleTitleMatch ? 10 : 5;

    const totalScore = Math.round(mandatoryScore + preferredScore + expScore + prefScore);

    // Classification
    let status = "Not Shortlisted";
    if (mandatoryRatio === 1) {
      status = totalScore >= 75 ? "Strong Match" : "Good Match";
    } else if (mandatoryRatio >= 0.5) {
      status = "Potential Match with Skill Gaps";
    }

    return {
      roleId: role.id,
      title: role.title,
      department: role.department,
      experienceLevel: role.experienceLevel,
      status,
      matchScore: totalScore,
      matchingMandatory,
      missingMandatory,
      matchingPreferred,
      missingPreferred,
      mandatoryRequirements: role.mandatoryRequirements,
      alternativeRoles: role.alternativeRoles,
      learningPathway: role.learningPathway,
      typicalCompensation: role.typicalCompensation,
      experienceSuitability: expPassed ? "Sufficient Experience" : "Entry-Level / Mentorship Required",
    };
  });

  // Sort by best match score
  evaluatedRoles.sort((a, b) => b.matchScore - a.matchScore);

  const bestMatch = evaluatedRoles[0];
  const alternatives = evaluatedRoles.filter((r) => r.roleId !== bestMatch?.roleId && r.matchScore >= 40);

  return {
    category: "job",
    candidateProfile: {
      preferredRole: profile.preferredRole,
      skillsProvided: rawSkills,
      yearsExperience,
      education,
    },
    bestMatch,
    alternatives: alternatives.slice(0, 3),
    deterministicOutcome: bestMatch?.status === "Strong Match"
      ? "Recommended for Shortlist"
      : bestMatch?.status === "Good Match"
      ? "Positive Match"
      : bestMatch?.status === "Potential Match with Skill Gaps"
      ? "Conditional Match (Upskilling Suggested)"
      : "Alternative Roles Recommended",
    confidence: bestMatch ? Math.max(50, Math.min(95, bestMatch.matchScore)) : 55,
  };
}
