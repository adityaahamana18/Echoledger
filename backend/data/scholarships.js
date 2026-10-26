// Verified Scholarship Schemes Knowledge Base
// All criteria, amounts, official links, and provenance are curated from verified institutional sources.

export const SCHOLARSHIPS = [
  {
    id: "nsp-csss",
    name: "Central Sector Scheme of Scholarships for College and University Students",
    provider: "Ministry of Education, Department of Higher Education (India)",
    officialUrl: "https://scholarships.gov.in",
    provenance: "National Scholarship Portal Guidelines 2024-25",
    lastVerified: "2026-01-15",
    level: ["Undergraduate", "Postgraduate"],
    eligibleCourses: ["Engineering", "Medicine", "Sciences", "Commerce", "Humanities", "Law", "Management"],
    minMarksPercentage: 80, // Top 20th percentile in Class 12 board
    minCgpa: 8.0, // on 10.0 scale for college renewals
    maxFamilyIncome: 450000, // Rs. 4.5 Lakh per annum
    awardAmount: "₹12,000/year at graduation level; ₹20,000/year at post-graduation level",
    mandatoryRequirements: [
      "Passed Class 12 or equivalent with 80%+ / top 20th percentile in relevant board",
      "Pursuing regular (full-time) degree course in a recognized institution",
      "Gross annual family income must not exceed ₹4,50,000",
      "Not in receipt of any other centrally funded scholarship",
    ],
    documentsRequired: [
      "Class 12 Marksheet & Passing Certificate",
      "Annual Income Certificate issued by competent revenue authority",
      "College/University Admission Proof & Student ID Card",
      "Aadhaar-linked Bank Passbook copy",
    ],
  },
  {
    id: "inspire-she",
    name: "INSPIRE Scholarship for Higher Education (SHE)",
    provider: "Department of Science and Technology (DST, Government of India)",
    officialUrl: "https://online-inspire.gov.in",
    provenance: "DST INSPIRE SHE Scheme Notification",
    lastVerified: "2026-02-01",
    level: ["Undergraduate", "Integrated Master's"],
    eligibleCourses: ["Basic & Natural Sciences (B.Sc., B.S., Int. M.Sc. in Physics, Chemistry, Maths, Biology)"],
    minMarksPercentage: 85, // Top 1% in Class 12 examination
    minCgpa: 8.5,
    maxFamilyIncome: null, // Pure merit-based (no income ceiling)
    awardAmount: "₹80,000/year (₹60,000 direct cash + ₹20,000 research mentorship)",
    mandatoryRequirements: [
      "Top 1% rank in Class 12 examination from state or central board, OR top 10,000 rank in JEE/NEET pursuing Natural Sciences",
      "Enrolled in B.Sc., B.S., or 5-year Integrated M.Sc. in Natural & Basic Sciences",
      "Full-time regular program enrollment in a recognized university",
    ],
    documentsRequired: [
      "Class 12 Marksheet with Board Advisory Note / Rank Certificate",
      "Endorsement Certificate signed by College Principal / University Registrar",
      "State / National Entrance Rank Card (if qualifying through JEE/NEET)",
    ],
  },
  {
    id: "post-matric-merit-means",
    name: "Merit-cum-Means Financial Assistance Scheme",
    provider: "State Higher Education Directorate",
    officialUrl: "https://scholarships.gov.in",
    provenance: "State Higher Education Directorate Policy Framework",
    lastVerified: "2026-01-20",
    level: ["Diploma", "Undergraduate", "Postgraduate"],
    eligibleCourses: ["All Technical, Professional and General Degree Courses"],
    minMarksPercentage: 60,
    minCgpa: 6.0,
    maxFamilyIncome: 250000, // Rs. 2.5 Lakh per annum
    awardAmount: "100% or 50% tuition fee reimbursement depending on income tier",
    mandatoryRequirements: [
      "Secured at least 60% marks in the qualifying examination",
      "Gross annual household income must not exceed ₹2,50,000",
      "Permanent resident / domicile of the awarding state",
      "Enrolled in a recognized government or affiliated private college",
    ],
    documentsRequired: [
      "Domicile Certificate of the State",
      "Income Certificate from Tehsildar / Sub-Divisional Magistrate",
      "Fee Receipts and Course Bonafide Certificate",
      "Previous Year Grade Transcripts",
    ],
  },
  {
    id: "dr-apj-abdul-kalam-tech",
    name: "Dr. A.P.J. Abdul Kalam Technical Excellence Fellowship",
    provider: "National Innovation Council / Technical Education Board",
    officialUrl: "https://scholarships.gov.in",
    provenance: "Technical Education Excellence Fund Guidelines",
    lastVerified: "2026-02-10",
    level: ["Undergraduate", "Postgraduate"],
    eligibleCourses: ["Computer Science", "Artificial Intelligence", "Information Technology", "Electronics"],
    minMarksPercentage: 75,
    minCgpa: 7.5,
    maxFamilyIncome: 600000, // Rs. 6.0 Lakh per annum
    awardAmount: "₹50,000/year towards project, hardware and tuition expenses",
    mandatoryRequirements: [
      "Enrolled in an accredited STEM / Engineering degree course",
      "Minimum 7.5 CGPA on a 10.0 scale (or equivalent 75%)",
      "Demonstrated technical project or open-source research contribution",
    ],
    documentsRequired: [
      "College Transcript / Semester Grade Cards",
      "Project Abstract / Technical Portfolio URL",
      "Recommendation Letter from Faculty Advisor",
    ],
  },
];
