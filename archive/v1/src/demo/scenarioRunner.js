/*
 * Responsibility:
 * - HTML/선언형 시나리오 목록을 demo UI가 소비하기 쉬운 형태로 제공한다.
 * - scenario 검색, 기본 시나리오 선택, UI 옵션 생성을 담당한다.
 */

export function createScenarioRunner(options = {}) {
  const scenarios = options.scenarios ?? [];

  return {
    list() {
      return scenarios.slice();
    },
    getDefault() {
      return scenarios[0] ?? null;
    },
    getByName(name) {
      return scenarios.find((scenario) => scenario.name === name) ?? null;
    },
    toSelectOptions() {
      return scenarios.map((scenario) => ({
        value: scenario.name,
        label: scenario.label ?? scenario.name,
      }));
    },
  };
}
