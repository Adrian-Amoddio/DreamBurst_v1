import "dotenv/config";
import { handleBriefGenerate } from "./tools/brief";

(async () => {
  const out = await handleBriefGenerate({ prompt: "Design a cozy mountain coffee brand" });
  console.log(out);
})();
