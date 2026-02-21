# HIVEMIND

[![GitHub Repo](https://img.shields.io/badge/repo-prodmutant/HIVEMIND-blue)](https://github.com/prodmutant/HIVEMIND)

> Experimental AI pipeline builder — very early stages, just me experimenting with AI nodes and wrappers.  
> Built by **prodmutant** with the help of **Claude Code**.

---

## About

HIVEMIND lets you **drag-and-drop AI models**, connect them, wrap them together, and execute pipelines with prompts.  
Think of it as a “visual AI workflow builder” — but **very experimental**.

> ⚠️ This project is in **early development**. I honestly don’t know what I’m doing yet, just experimenting and learning.

---

## Features

- Drag models from the right panel onto a canvas
- Connect models with input/output ports
- Group models into “Wrappers” to run sequentially or in parallel
- Set a prompt source node and execute the pipeline
- Track execution progress per model
- Supports free models out-of-the-box and paid models with OpenRouter API key

---

## Current Limitations

- Wrappers **have issues** and might not work properly in some cases  
- Multiple outputs at the same time are **not fully supported**  
- Expect bugs and weird behavior — this is my first repo, remember!  

> These issues will be worked on over time. For now, consider the wrapper feature experimental.

---



## Installation

Make sure you have **Node.js >=16** installed.

```bash
# Clone the repo
git clone https://github.com/prodmutant/HIVEMIND.git
cd HIVEMIND

# Install dependencies
npm install

# Start the dev server
npm start
