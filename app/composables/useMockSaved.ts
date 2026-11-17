/** Mock "saved" (heart) state for services, shared by cards, profiles and /kaydedilenler. */
export function useMockSaved() {
  const ids = useState<string[]>('v2-mock-saved', () => ['ornek-atasehir-ekspertiz', 'ornek-klima-servis', 'ornek-lastik-rot']);
  return {
    ids,
    has: (id: string) => ids.value.includes(id),
    toggle(id: string, on?: boolean) {
      const present = ids.value.includes(id);
      const want = on ?? !present;
      if (want && !present) ids.value = [...ids.value, id];
      if (!want && present) ids.value = ids.value.filter((x) => x !== id);
    },
  };
}
