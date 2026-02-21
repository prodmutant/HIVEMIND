## Technical Overview

HIVEMIND is a **graph-based AI pipeline builder**. AI workflows are represented as a **directed graph of nodes**, where each node is either an agent, wrapper, or output. Connections define how data flows through the pipeline.

> ⚠️ Note: This is an early experimental version. Wrappers may behave unpredictably, multiple outputs are not fully supported, and some features may produce unexpected results.

---

### 1. Nodes

**Agent Node**
- Represents a single AI model.
- Metadata includes:
  - `model`: the AI model object (id, name, context length, pricing, modality, etc.)
  - `type`: `'agent'`
  - `x, y`: canvas coordinates
- Execution via `callModel()`.
- Supports free models (via Puter.js) or paid models (via OpenRouter API key).

**Wrapper Node**
- Container node that groups multiple agent nodes.
- Metadata:
  - `agents`: list of node IDs contained within the wrapper
  - `mode`: `'sequential'` or `'parallel'`
  - `synthesizerIdx`: index of the agent used to combine results in parallel mode
- Execution:
  - **Sequential**: agents run one after another, passing intermediate outputs
  - **Parallel**: agents run simultaneously; synthesizer agent optionally merges outputs

**Output Node**
- Terminal node that displays the final AI response.

---

### 2. Connections

- Represented as objects: `{ id, from, to }`
- Data flows from the `from` node’s output to the `to` node’s input
- Circular connections are detected to prevent infinite loops
- Each node can have multiple outgoing connections (currently only the first is used during execution)

---

### 3. Execution Flow

The execution engine is implemented in `runNode()` and `executeGraph()`:

1. **Prompt Target Node**: User selects which node receives the prompt
2. **Recursive Node Execution**:
   - Agent nodes call `callModel()` with the prompt
   - Wrapper nodes call `executeWrapper()`
   - Output nodes simply return the input
3. **Wrapper Execution**:
   - Sequential mode: agents run in order; each receives previous outputs
   - Parallel mode: all agents run simultaneously; synthesizer combines outputs
4. **Result Propagation**:
   - Node outputs are passed to connected downstream nodes
   - Execution stops on failure or circular detection
5. **Tracking Execution**:
   - Node statuses (`running`, `done`, `error`) and outputs are stored in `executionResults`
   - The final output is stored in `finalResult`

---

### 4. Data Storage

- API keys are stored locally in `localStorage` (`hm_keys`)
- Uploaded files are held in memory (`uploadedFile` in Zustand store)
- Pipeline graph (nodes and connections) is stored in memory using Zustand state

---

### 5. State Management

- Uses **Zustand** for global state:
  - Nodes, connections, prompt, API keys, execution results, wiring mode, selected nodes
- Helper functions include:
  - `addNode()`, `removeNode()`, `addConnection()`, `removeConnection()`, `setNodeResult()`
- Provides live UI updates and smooth canvas interaction

---

### 6. AI Model Integration

- Supports **OpenRouter** models via API
- Free models run in-browser via **Puter.js**
- `callModel()` handles:
  - Text or file inputs (image/audio/file)
  - API key verification
  - Error handling and progress reporting

---

### 7. Canvas and Wiring

- Nodes are absolutely positioned on an HTML canvas
- Connections are drawn using SVG cubic Bezier curves
- Users can drag nodes, wire ports, or assign prompts
- Wiring logic dynamically tracks mouse position to render active connections

---

### 8. Current Limitations

- Wrapper parallel execution can misbehave
- Multiple outputs are not fully supported
- Circular detection prevents infinite loops but complex graphs may require optimization
- Very early-stage experimental architecture; expect bugs and unexpected behaviors

---

HIVEMIND is essentially a **lightweight, visual AI workflow engine**. Nodes represent AI models and wrappers, connections define the data flow, and execution recursively evaluates the graph to produce outputs. The system is experimental and primarily designed for learning and prototyping AI pipelines.
