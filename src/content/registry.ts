/**
 * Every *.json file in /content is bundled here. Adding a topic means adding a file
 * and nothing else — there is no list to keep in sync.
 *
 * `require.context` is a Metro feature; Expo's metro config turns it on by default
 * (transformer.unstable_allowRequireContext), which is also how expo-router discovers
 * routes. It is resolved statically at build time, so the arguments must stay literals.
 */
const topicContext = (require as unknown as {
  context: (
    dir: string,
    useSubdirectories: boolean,
    regExp: RegExp
  ) => { keys(): string[]; (id: string): unknown };
}).context('../../content', false, /\.json$/);

export interface RawTopicEntry {
  /** File name, used as the "where" in validation messages. */
  name: string;
  data: unknown;
}

export function loadRawTopicEntries(): RawTopicEntry[] {
  // Sorted so the bundle order is stable across platforms; the feed's real ordering
  // comes from the prerequisite graph, not from file order.
  return topicContext
    .keys()
    .slice()
    .sort()
    .map((key) => ({ name: key.replace(/^\.\//, ''), data: topicContext(key) }));
}
