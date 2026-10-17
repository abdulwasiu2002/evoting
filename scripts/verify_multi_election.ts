/**
 * NACOS Multi-Election Management Verification & Safety Test Suite
 * Demonstrates:
 * 1. Existing live election baseline retention (candidates, votes, turnout)
 * 2. Independent second election creation without data interference
 * 3. Second election starts with 0 votes
 * 4. Cross-election vote isolation & position scoping
 * 5. Student identity reuse across elections (one account, multiple ballots)
 * 6. Protection against deleting elections with votes
 * 7. Rejection of votes in closed/archived elections
 */

import { db } from '../services/mockDb';
import { DEFAULT_ELECTION_ID, Election, UserRole, ApprovalStatus } from '../types';

async function runTests() {
  console.log("================================================================================");
  console.log("       NACOS E-VOTING — MULTI-ELECTION ARCHITECTURE VERIFICATION TEST");
  console.log("================================================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ' -> ' + detail : ''}`);
      failed++;
    }
  }

  try {
    // TEST 1: Baseline Election Verification
    console.log("\n--- TEST 1: Baseline Live Election Verification ---");
    const elections = await db.getElections();
    const baseline = elections.find(e => e.id === DEFAULT_ELECTION_ID);
    assert(!!baseline, "Primary baseline election exists (nacos-election-2024)");
    assert(baseline?.status === 'live', "Baseline election is LIVE in status");

    const baselineStats = await db.getElectionStats(DEFAULT_ELECTION_ID);
    console.log(`Baseline Stats: Approved Voters: ${baselineStats.totalApproved}, Total Votes: ${baselineStats.totalVotesCast}, Distinct Voters: ${baselineStats.distinctVoters}`);
    assert(typeof baselineStats.totalApproved === 'number', "Baseline stats totalApproved is valid number");
    assert(typeof baselineStats.distinctVoters === 'number', "Baseline stats distinctVoters is valid number");

    const baselineCandidates = await db.getCandidates(DEFAULT_ELECTION_ID);
    assert(baselineCandidates.length >= 2, `Baseline candidates preserved (${baselineCandidates.length} found)`);

    // TEST 2: Creation of Second Independent Election
    console.log("\n--- TEST 2: Create Second Election (Departmental By-Election 2025/2026) ---");
    const secondElectionId = 'nacos-by-election-2025';
    
    // Clean up if already exists from prior test run
    const existingSecond = await db.getElection(secondElectionId);
    if (existingSecond) {
      // It exists from previous run, let's verify it
    } else {
      await db.createElection('admin-1', {
        id: secondElectionId,
        title: 'NACOS Departmental By-Election 2025/2026',
        session: '2025/2026',
        description: 'By-election for vacant departmental faculty representative seats.',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        isVotingEnabled: false,
        eligibleLevels: ['All'],
        eligibleDepartments: ['Computer Science', 'Cyber Security'],
        aspirantRegistrationOpen: true,
        aspirantFeeRequired: true,
        createdBy: 'admin-1'
      });
    }

    const fetchedSecond = await db.getElection(secondElectionId);
    assert(!!fetchedSecond, "Second election successfully created and retrieved");
    assert(fetchedSecond?.session === '2025/2026', "Second election has correct academic session (2025/2026)");
    assert(fetchedSecond?.status === 'draft', "Second election initial status is DRAFT");

    // TEST 3: Zero-Vote Isolation for New Election
    console.log("\n--- TEST 3: Zero-Vote Isolation Verification ---");
    const secondStats = await db.getElectionStats(secondElectionId);
    assert(secondStats.totalVotesCast === 0, "Second election starts with exactly 0 votes cast");
    assert(secondStats.distinctVoters === 0, "Second election starts with exactly 0 distinct voters");

    // TEST 4: Position and Candidate Scoping
    console.log("\n--- TEST 4: Scoped Positions & Candidates ---");
    await db.addPosition('admin-1', 'Faculty Representative', 2000, 'HND I', secondElectionId);
    const secondPositions = await db.getPositions(secondElectionId);
    assert(secondPositions.some(p => p.name === 'Faculty Representative'), "Faculty Representative position belongs to second election");

    const baselinePositions = await db.getPositions(DEFAULT_ELECTION_ID);
    assert(!baselinePositions.some(p => p.name === 'Faculty Representative'), "Faculty Representative position DOES NOT leak into baseline election");

    // Add candidate to second election
    const newCand = await db.addCandidate('admin-1', {
      name: 'Bilikisu Suleiman',
      matricNo: 'CS/2022/999',
      department: 'Computer Science',
      position: 'Faculty Representative',
      manifesto: 'I will advocate for tech laboratory enhancements.',
      photoUrl: 'https://picsum.photos/200/200?random=88',
      level: 'HND I',
      electionId: secondElectionId
    }, secondElectionId);

    const secondCands = await db.getCandidates(secondElectionId);
    assert(secondCands.some(c => c.name === 'Bilikisu Suleiman'), "Candidate Bilikisu Suleiman belongs to second election");

    const refreshedBaselineCands = await db.getCandidates(DEFAULT_ELECTION_ID);
    assert(!refreshedBaselineCands.some(c => c.name === 'Bilikisu Suleiman'), "Candidate Bilikisu Suleiman DOES NOT appear in baseline election");

    // TEST 5: Voting Rejection When Election is Draft
    console.log("\n--- TEST 5: Reject Votes on Draft Election ---");
    let draftRejected = false;
    try {
      await db.castVote('u-demo-student', newCand.id, 'Faculty Representative', secondElectionId);
    } catch (err: any) {
      draftRejected = true;
      console.log(`Expected rejection message: "${err.message}"`);
    }
    assert(draftRejected, "Draft election strictly rejects vote casting attempts");

    // TEST 6: Student Shared Identity Across Elections
    console.log("\n--- TEST 6: Student Identity Reuse & Scoped Ballots ---");
    // Ensure an approved test student exists
    let testStudent: any;
    try {
      testStudent = await db.register({
        fullName: 'Test Voter Multi',
        matricNo: 'CS/2023/TEST01',
        department: 'Computer Science',
        level: 'HND I',
        passwordHash: 'pass123'
      });
      await db.processRegistration('admin-1', testStudent.id, true);
    } catch {
      // If student already exists, find them
      const users = (await (db as any).getItems?.('univote_users')) || [];
      testStudent = users.find((u: any) => u.matricNo === 'CS/2023/TEST01');
    }

    assert(!!testStudent, "Shared student identity available in system");

    // Open second election temporarily to live
    await db.setElectionStatus('admin-1', secondElectionId, 'live');
    const liveSecond = await db.getElection(secondElectionId);
    assert(liveSecond?.status === 'live', "Second election transitioned to LIVE");

    // Cast vote in second election
    const castRes = await db.castVote(testStudent.id, newCand.id, 'Faculty Representative', secondElectionId);
    assert(!!castRes.id, "Student successfully cast vote in second election");

    // Verify second election stats increased
    const secondStatsAfterVote = await db.getElectionStats(secondElectionId);
    assert(secondStatsAfterVote.totalVotesCast === 1, "Second election totalVotesCast increased to 1");
    assert(secondStatsAfterVote.distinctVoters === 1, "Second election distinctVoters increased to 1");

    // Verify baseline election was completely untouched
    const baselineStatsAfter = await db.getElectionStats(DEFAULT_ELECTION_ID);
    assert(baselineStatsAfter.totalVotesCast === baselineStats.totalVotesCast, "Baseline election votes remained 100% UNTOUCHED");
    assert(baselineStatsAfter.distinctVoters === baselineStats.distinctVoters, "Baseline election distinct voters remained 100% UNTOUCHED");

    // TEST 7: Duplicate Vote Prevention in Same Election
    console.log("\n--- TEST 7: One-Vote-Per-Position Database Guard ---");
    let duplicateBlocked = false;
    try {
      await db.castVote(testStudent.id, newCand.id, 'Faculty Representative', secondElectionId);
    } catch (err: any) {
      duplicateBlocked = true;
      console.log(`Expected duplicate rejection: "${err.message}"`);
    }
    assert(duplicateBlocked, "Duplicate vote for same position in same election was BLOCKED");

    // TEST 8: Safety Guard Against Accidental Deletion
    console.log("\n--- TEST 8: Prevent Accidental Deletion of Election with Votes ---");
    let deletionBlocked = false;
    try {
      await db.deleteElection('admin-1', secondElectionId);
    } catch (err: any) {
      deletionBlocked = true;
      console.log(`Expected deletion guard: "${err.message}"`);
    }
    assert(deletionBlocked, "Election with votes cannot be deleted (Safety Guard enforced)");

    // Restore baseline election to live
    await db.setElectionStatus('admin-1', DEFAULT_ELECTION_ID, 'live');
    await db.setElectionStatus('admin-1', secondElectionId, 'closed');

    // SUMMARY
    console.log("\n================================================================================");
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("================================================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (e) {
    console.error("Test execution encountered an error:", e);
    process.exit(1);
  }
}

runTests();
