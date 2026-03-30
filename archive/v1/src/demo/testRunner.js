/*
 * Responsibility:
 * - demo 화면에서 여러 테스트 스위트를 한 번에 실행하고 요약 결과를 만든다.
 * - UI 렌더링은 app.js가 담당하고, 이 모듈은 실행과 집계만 수행한다.
 */

export function createTestRunner(options = {}) {
  const suites = options.suites ?? [];

  return {
    runAll() {
      const suiteResults = suites.map((suite) => ({
        name: suite.name,
        cases: suite.run(),
      }));

      const flatCases = suiteResults.flatMap((suite) =>
        suite.cases.map((testCase) => ({
          suite: suite.name,
          ...testCase,
        }))
      );

      const passedCount = flatCases.filter((testCase) => testCase.passed && !testCase.skipped).length;
      const skippedCount = flatCases.filter((testCase) => testCase.skipped).length;
      const failedCount = flatCases.filter((testCase) => !testCase.passed && !testCase.skipped).length;

      return {
        suiteResults,
        flatCases,
        summary: {
          totalSuites: suiteResults.length,
          totalCases: flatCases.length,
          passedCount,
          failedCount,
          skippedCount,
        },
      };
    },
  };
}
