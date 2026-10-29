// Reads a child process's stdout and stderr, keeping at most outputLimit bytes
// of each. Going over the limit calls onLimit once (used to kill the container).
export function collect(child, { outputLimit, onLimit }) {
  const streams = { stdout: [], stderr: [] };
  const sizes = { stdout: 0, stderr: 0 };
  let overLimit = false;
  for (const key of ["stdout", "stderr"]) {
    child[key].on("data", chunk => {
      const room = outputLimit - sizes[key];
      if (room > 0) {
        streams[key].push(chunk.subarray(0, room));
        sizes[key] += Math.min(room, chunk.length);
      }
      if (chunk.length > room && !overLimit) {
        overLimit = true;
        onLimit();
      }
    });
  }
  return {
    result: () => ({
      stdout: Buffer.concat(streams.stdout).toString("utf8"),
      stderr: Buffer.concat(streams.stderr).toString("utf8"),
      outputLimit: overLimit,
    }),
  };
}
