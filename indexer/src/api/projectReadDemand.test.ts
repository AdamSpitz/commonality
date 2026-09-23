import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isBareContractLogQuery,
  projectReadDemandReport,
  recordUnindexedProjectLogRequest,
  resetProjectReadDemand,
} from "./projectReadDemand";

const PROJECT_A = "0x1111111111111111111111111111111111111111";
const PROJECT_B = "0x2222222222222222222222222222222222222222";
const PROJECT_C = "0x3333333333333333333333333333333333333333";
const FACTORY = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

test("groups repeated misses by a known factory and ignores a single project", () => {
  resetProjectReadDemand();
  const now = 1_000_000;
  recordUnindexedProjectLogRequest(PROJECT_A, now - 10);
  recordUnindexedProjectLogRequest(PROJECT_A, now - 5);
  recordUnindexedProjectLogRequest(PROJECT_B, now - 4);
  recordUnindexedProjectLogRequest(PROJECT_C, now - 3);
  recordUnindexedProjectLogRequest("not an address", now);

  const report = projectReadDemandReport(new Map([
    [PROJECT_A, FACTORY],
    [PROJECT_B, FACTORY],
  ]), now, 1_000);

  assert.deepEqual(report.projects.map((project) => project.address), [PROJECT_A, PROJECT_C, PROJECT_B]);
  assert.equal(report.projects[0]?.requests, 2);
  assert.equal(report.projects[0]?.factory, FACTORY);
  assert.equal(report.projects.find((project) => project.address === PROJECT_C)?.factory, undefined);
  assert.deepEqual(report.factories, [{
    factory: FACTORY,
    requests: 3,
    projects: [PROJECT_A, PROJECT_B],
  }]);
});

test("a bare contract query is the only demand probe", () => {
  assert.equal(isBareContractLogQuery({ contractAddress: PROJECT_A }), true);
  assert.equal(isBareContractLogQuery({ contractAddress: PROJECT_A, eventName: "ERC1155Bought" }), false);
  assert.equal(isBareContractLogQuery({ contractAddress: PROJECT_A, topic1: "0x01" }), false);
  assert.equal(isBareContractLogQuery({ contractAddress: PROJECT_A, blockNumber_gte: "10" }), false);
  assert.equal(isBareContractLogQuery({}), false);
});

test("drops misses outside the window", () => {
  resetProjectReadDemand();
  recordUnindexedProjectLogRequest(PROJECT_A, 1);
  const report = projectReadDemandReport(new Map(), 10_000, 1_000);
  assert.deepEqual(report.projects, []);
});
