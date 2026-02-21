## 🧩 Technical Overview

HIVEMIND is a **graph-based AI pipeline builder**. It represents AI workflows as a **directed graph of nodes**, where each node is either an agent, wrapper, or output. Connections define how data flows through the pipeline.

---

### 1. Nodes

**Agent Node**
- Represents a single AI model.
- Holds metadata:
  - `model`: the AI model object (id, name, context length, pricing, modality, etc.).
  - `type`: `'agent'`.
  - `x, y`: coordinates on the canvas.
- Can execute via `callModel()`.
- Supports free models (via Puter.js) or paid models (OpenRouter API key).

**Wrapper Node**
- A container node that groups multiple agent nodes.
- Metadata:
  - `agents`: list of node IDs inside the wrapper.
  - `mode`: `'sequential'` or `'parallel'`.
  - `synthesizerIdx`: index of the agent used to synthesize results in parallel mode.
- Execution:
  - Sequential: runs agents one after another, passing intermediate results.
  - Parallel: runs all agents at once, optionally synthesizing results via the synthesizer agent.

**Output Node**
- Terminal node in the graph.
- Displays the final AI response.

---

### 2. Connections

- Connections are represented as objects: `{ id, from, to }`.
- Data flows from `from` node’s output to `to` node’s input.
- Circular connections are detected to prevent infinite loops.
- Each node can have multiple outgoing connections (currently only the first is processed in execution).

---

### 3. Execution Flow

The execution engine is implemented in `runNode()` and `executeGraph()`:

1. **Start at the prompt target node**:
   - The user sets which node will receive the prompt.
2. **Recursive node execution**:
   - If node is **agent**, it calls `callModel()` with the prompt.
   - If node is **wrapper**, it calls `executeWrapper()`.
   - If node is **output**, it simply returns the input.
3. **Wrapper execution**:
   - Sequential mode: agents run one by one; each agent receives previous outputs.
   - Parallel mode: agents run simultaneously; synthesizer agent combines outputs.
4. **Propagation**:
   - The result of a node is passed to connected downstream nodes.
   - Execution stops if a node fails or a circular connection is detected.
5. **Results tracking**:
   - Each node’s execution status (`running`, `done`, `error`) and output are stored in `executionResults`.
   - The final output is stored in `finalResult`.

---

### 4. Data Storage

- API keys are stored locally in `localStorage` (`hm_keys`).
- Uploaded files are held in memory only (`uploadedFile` in Zustand store).
- Pipeline graph (nodes and connections) is in memory (Zustand state).

---

### 5. State Management

- Uses **Zustand** for global state:
  - Nodes, connections, prompt, API keys, execution results, wiring mode, selected nodes, etc.
- Provides helpers:
  - `addNode()`, `removeNode()`, `addConnection()`, `removeConnection()`, `setNodeResult()`, etc.
- Allows live UI updates and smooth interaction with the canvas.

---

### 6. AI Model Integration

- Supports **OpenRouter models** via API.
- Free models use **Puter.js** for client-side execution.
- `callModel()` handles:
  - Text-only or file inputs (image/audio/file).
  - API key verification.
  - Error handling and progress updates.

---

### 7. Canvas and Wiring

- Nodes are rendered absolutely on an HTML canvas layer.
- Connections are drawn with SVG cubic Bezier curves.
- Users can drag nodes, start wiring from ports, or connect the prompt to a node.
- Wiring logic tracks mouse position and dynamically draws the active connection.

---

### 8. Current Limitations

- Wrapper parallel execution can misbehave.
- Multiple outputs are not fully supported.
- Circular detection prevents infinite loops, but complex graphs may need optimization.
- Very early-stage experimental architecture.

---

This is essentially a **lightweight, visual workflow engine** where AI models are nodes and connections define the data flow. The engine recursively evaluates nodes based on the graph structure.
