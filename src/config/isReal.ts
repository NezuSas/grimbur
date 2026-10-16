/** A contact address or link is real once it no longer points to the placeholder the project ships with. */
export const isReal = (value: string | undefined): boolean => !!value && !value.includes('example.com');
