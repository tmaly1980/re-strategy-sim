// Thin re-export proxy — all logic lives in engine/, acquisition/, sales/.
// This file exists so legacy imports from "../engine" keep working during migration.
export { runSimulation } from "./engine/runSimulation";
export type { SimulationInput } from "./engine/runSimulation";
export { evaluateAcquisition, skipMessage } from "./acquisition/evaluateAcquisition";
export type { ResolvedMarketConditions } from "./types/market";
