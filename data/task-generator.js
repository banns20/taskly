const crypto = require("node:crypto");

const categories = ["Student life", "Environment", "Technology", "Community"];
const taskDurations = [30, 35, 40, 45, 50, 55, 60];
const taskColors = ["lavender", "peach", "mint", "blue", "yellow", "pink"];
const tasksPerGeneration = 3;

function normalizeTaskTitle(title) {
  return title.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
}

function readResponseText(response) {
  if (typeof response.output_text === "string") return response.output_text;
  const text = response.output?.flatMap((item) => item.content || [])
    .find((content) => content.type === "output_text")?.text;
  if (typeof text !== "string") throw new Error("OpenAI returned no task-generation text.");
  return text;
}

function validateTaskBatch(parsed, existingTasks) {
  if (!Array.isArray(parsed.tasks) || parsed.tasks.length !== tasksPerGeneration) {
    throw new Error(`OpenAI must return exactly ${tasksPerGeneration} new tasks.`);
  }

  const knownTitles = new Set(existingTasks.map((task) => normalizeTaskTitle(task.title)));
  const knownTopics = new Set(existingTasks.map((task) => normalizeTaskTitle(task.topic || "")));
  const batchTitles = new Set();
  const batchTopics = new Set();
  return parsed.tasks.map((task) => {
    if (!task || typeof task !== "object" ||
        !categories.includes(task.category) ||
        typeof task.title !== "string" || !task.title.trim() || task.title.trim().length > 120 ||
        typeof task.description !== "string" || !task.description.trim() || task.description.trim().length > 240 ||
        typeof task.topic !== "string" || !task.topic.trim() || task.topic.trim().length > 160 ||
        typeof task.brief !== "string" || !task.brief.trim() || task.brief.trim().length > 1600 ||
        !taskDurations.includes(task.durationMinutes)) {
      throw new Error("OpenAI returned a task with invalid or incomplete fields.");
    }

    const title = task.title.trim();
    const normalizedTitle = normalizeTaskTitle(title);
    const normalizedTopic = normalizeTaskTitle(task.topic);
    if (knownTitles.has(normalizedTitle) || batchTitles.has(normalizedTitle) ||
        knownTopics.has(normalizedTopic) || batchTopics.has(normalizedTopic)) {
      throw new Error("OpenAI returned a task title or topic that has already been used.");
    }
    batchTitles.add(normalizedTitle);
    batchTopics.add(normalizedTopic);

    return {
      id: `ai-${crypto.randomUUID()}`,
      title,
      description: task.description.trim(),
      topic: task.topic.trim(),
      brief: task.brief.trim(),
      category: task.category,
      time: `${task.durationMinutes} min`,
      reward: 0,
      featured: false,
      color: taskColors[crypto.randomInt(taskColors.length)],
      assignedBy: "Taskly",
      generated: true
    };
  });
}

async function generateTaskBatch({ apiKey, existingTasks, fetchImplementation = fetch }) {
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  if (!Array.isArray(existingTasks)) throw new Error("Existing tasks must be provided.");
  if (typeof fetchImplementation !== "function") throw new Error("A fetch implementation is required.");

  const response = await fetchImplementation("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    signal: AbortSignal.timeout(60_000),
    body: JSON.stringify({
      model: "gpt-4o-mini",
      store: false,
      instructions: [
        "Create original, practical student research practice tasks for a Kenyan student audience.",
        "Choose research questions across the allowed categories and avoid repeating or closely paraphrasing any previously used title or topic.",
        "These are practice prompts only: do not claim a real client commissioned them, promise payment, request personal data, or invent sources.",
        "Write clear, self-contained briefs that can be researched using public, credible sources.",
        "Return exactly three distinct tasks."
      ].join(" "),
      input: JSON.stringify({
        categories,
        allowedDurationMinutes: taskDurations,
        previouslyUsedTasks: existingTasks.map(({ title, topic }) => ({ title, topic }))
      }),
      text: {
        format: {
          type: "json_schema",
          name: "hourly_research_tasks",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["tasks"],
            properties: {
              tasks: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["category", "title", "description", "topic", "brief", "durationMinutes"],
                  properties: {
                    category: { type: "string", enum: categories },
                    title: { type: "string" },
                    description: { type: "string" },
                    topic: { type: "string" },
                    brief: { type: "string" },
                    durationMinutes: { type: "integer", enum: taskDurations }
                  }
                }
              }
            }
          }
        }
      }
    })
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(`OpenAI task generation failed with HTTP ${response.status}: ${responseBody.slice(0, 500)}`);
  }

  let generatedResponse;
  try {
    generatedResponse = await response.json();
  } catch (error) {
    throw new Error(`OpenAI returned invalid JSON: ${error.message}`);
  }

  let parsedTasks;
  try {
    parsedTasks = JSON.parse(readResponseText(generatedResponse));
  } catch (error) {
    throw new Error(`OpenAI returned invalid generated-task JSON: ${error.message}`);
  }

  return validateTaskBatch(parsedTasks, existingTasks);
}

module.exports = { generateTaskBatch, normalizeTaskTitle };
