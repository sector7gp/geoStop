export function getAccessPostFields(env = process.env) {
  const param = env.GEOSTOP_POST_PARAM || "geostop";
  const value = env.GEOSTOP_POST_VALUE ?? "true";

  return {
    [param]: value,
  };
}
