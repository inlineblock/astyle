export default function getCSSName(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => {
    return `-${letter.toLowerCase()}`;
  });
}
