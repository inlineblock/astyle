class SyntheticStyleSheet {
  rules: Set<string> = new Set<string>();

  constructor() {}

  insertRule(rule: string, _index: number = 0): void {
    this.rules.add(rule);
  }

  toString() {
    return Array.from(this.rules).join("\n");
  }
}

export default SyntheticStyleSheet;
