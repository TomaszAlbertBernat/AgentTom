// Observer types simplified for local-first usage

export type ObserverState = {
    traces: Map<string, any>;
    spans: Map<string, any>;
    generations: Map<string, any>;
};