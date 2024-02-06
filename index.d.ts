import { Kafka, ConsumerConfig, ProducerConfig, KafkaConfig, Admin, Consumer, Producer, CompressionTypes, Message, TopicPartitionOffsetAndMetadata } from "kafkajs"
import { ReadStream, PathLike } from "fs"

type TaskTypeHelper<I, T> = T extends (infer U)[] 
    ? U extends any[] ? TaskOfMultiArray<I, U[]> : TaskOfArray<I, U[]>
    : TaskOfObject<I, T>;

// T = current value type
// I = initial value type (needed for the "inject" method)

export declare interface TaskBase<I, T> {
    //base
    withMetadata: Function/*TBD*/
    setMetadata: Function/*TBD*/
    getMetadata: Function/*TBD*/

    withDefaultKey: Function/*TBD*/
    withEventTime: Function/*TBD*/
    keyBy: Function/*TBD*/

    filter: Function/*TBD*/
    sum: Function/*TBD*/ //???
    tokenize: Function/*TBD*/
    print: Function/*TBD*/

    branch: Function/*TBD*/
    readline: Function/*TBD*/

    //custom
    fn: Function/*TBD*/
    fnRaw: Function/*TBD*/
    customFunction: Function/*TBD*/
    customAsyncFunction: Function/*TBD*/
    customFunctionRaw: Function/*TBD*/
    customAsyncFunctionRaw: Function/*TBD*/
    joinByKeyWithParallelism: Function/*TBD*/

    //queue
    queueSize: Function/*TBD*/
    enqueue: Function/*TBD*/
    dequeue: Function/*TBD*/

    //storage
    withStorage: Function/*TBD*/
    toStorage: Function/*TBD*/
    fromStorage: Function/*TBD*/
    fromStorageToGlobalState: Function/*TBD*/
    disconnectStorage: Function/*TBD*/
    flushStorage: Function/*TBD*/
    storage: Function/*TBD*/

    //window
    tumblingWindowCount: Function/*TBD*/
    tumblingWindowTime: Function/*TBD*/
    sessionWindowTime: Function/*TBD*/
    slidingWindowCount: Function/*TBD*/
    slidingWindowTime: Function/*TBD*/

    //sink 
    toKafka: (kafkaSink: KSink, topic: string, callback?: (x: T) => Message[], options?: KSinkOptions) => TaskTypeHelper<I, T>
    kafkaCommit: (kafkaSource: KSource, commitParams: KCommitParams) => TaskTypeHelper<I, T>
 
    //source
    fromKafka: <R = any>(source: KSource) => TaskTypeHelper<I, KMessage<R>>
    fromArray: <R>(array: R[]) => TaskTypeHelper<I, R[]>
    fromObject: <R>(object: R) => TaskTypeHelper<I, R>
    fromString: (string: string) => TaskTypeHelper<I, string>
    fromInterval: <R = number>(intervalMs: number, generatorFunc?: (counter: number) => R, maxSize?: number) => TaskTypeHelper<I, R>/*TBD*/
    fromReadableStream: (filePath: PathLike, useZlib?: boolean) => TaskTypeHelper<I, ReadStream>

    inject: (data: I) => Promise<TaskTypeHelper<I, T>>

    [x: string]: any 
}

export declare interface TaskOfArray<I, T extends any[]> extends TaskOfObject<I, T> {
    map: <R>(func: (x: ElemOfArr<T>) => R) => TaskTypeHelper<I, R>
    each: Function/*TBD*/ //bug? the callback is never called
    filterArray: (func: (x: ElemOfArr<T>) => boolean) => TaskTypeHelper<I, T>
    reduce: <R>(func: (prev: ElemOfArr<T>, curr: ElemOfArr<T>, currIdx?: number) => R, initialValue?: R) => TaskTypeHelper<I, R>
    countInArray: Function/*TBD*/ //*???
    length: () => TaskTypeHelper<I, number>
    groupBy: (func: (elem: T, index: number, array: T[]) => any) => TaskTypeHelper<I, { [x in string | number]: T[] }> // TO CHECK

    [x: string]: any
}

export declare interface TaskOfMultiArray<I, T extends any[][]> extends TaskOfArray<I, T>, TaskOfObject<I, T> {
    flat: () => TaskTypeHelper<I, ElemOfArr<ElemOfArr<T>>[]>
    
    [x: string]: any
}

export declare interface TaskOfObject<I, T> extends TaskBase<I, T> {
    sumMap: Function/*TBD*/
    objectGroupBy: Function/*TBD*/
    aggregate: Function/*TBD*/

    [x: string]: any
}

export declare function Task<I = any>(id?: any): TaskTypeHelper<I, I> /*TBD*/
export declare function ExtendTask(name: string, extension: any /*TBD*/): void
export declare function ExtendTaskRaw(name: string, extension: any /*TBD*/): void

export enum StorageKind {
    Memory = "memory",
    Redis = "redis",
    Cassandra = "cassandra",
}

export declare interface Storage {
    db: () => any; /*TBD*/
    set: (key: string, value: any, ttl?: number | null) => Promise<void>; /*TBD*/
    get: (key: string) => Promise<any>; /*TBD*/
    push: (key: string, value: any) => Promise<void>; /*TBD*/
    getList: (key: string) => Promise<any[]>; /*TBD*/
    flush: (key: string) => Promise<void>; /*TBD*/
    slice: (key: string, numberOfItemsToRemove: number) => Promise<void>; /*TBD*/
    sliceByTime: (key: string, startTime: number) => Promise<void>; /*TBD*/
    disconnect: () => Promise<void>; /*TBD*/
    flushStorage: () => Promise<void>; /*TBD*/
}

export declare function MakeStorage(kind: StorageKind, config?: any/*TBD*/, id?: any /*TBD*/): Storage
export declare function ExposeStorageState(storageMap: any /*TBD*/, config: any /*TBD*/): void

export declare interface KMessage<T> {
    topic: string, 
    offset: number,
    partition: number, 
    headers: any, /*TBD*/
    key: string,
    value: T
}

type KCompressionType = 
    CompressionTypes.GZIP |
    CompressionTypes.LZ4 |
    CompressionTypes.None |
    CompressionTypes.Snappy |
    CompressionTypes.ZSTD 

type KSinkOptions = { 
    compressionType: KCompressionType
}

type KCommitParams = Pick<TopicPartitionOffsetAndMetadata, 'topic' | 'partition' | 'offset'>

export declare interface KSource {
    stream: (cb: any) => Promise<void> /*TBD*/
    consumer: () => Consumer
}

export declare interface KSink extends Producer {}

export type RekeyFunction = (s: any) => any /*TBD*/
export type SinkDataFunction = (s: any) => Message /*TBD*/

export declare interface Exch {
    setKeyParser: (fn: any) => any;/*TBD*/
    setValidationFunction: (fn: any) => any;/*TBD*/
    on: (fn: (x: any) => Promise<any>) => Promise<any>;/*TBD*/
    emit: (mex: any) => Promise<any>;/*TBD*/
}

export declare function KafkaClient(config: KafkaConfig): Kafka
export declare function KafkaAdmin(client: Kafka): Promise<Admin>
export declare function KafkaSource(client: Kafka, config: ConsumerConfig): Promise<KSource>
export declare function KafkaSink(client: Kafka, config: ProducerConfig): Promise<KSink>
export declare function KafkaCommit(source: KSource, params: KCommitParams): Promise<KCommitParams>
export declare function KafkaRekey(kafkaSource: KSource, rekeyFunction: RekeyFunction, kafkaSink: KSink, sinkTopic: string, sinkDataFunction: SinkDataFunction): void
export declare function Exchange(client: Kafka, topic: string, sourceOptions: ConsumerConfig, sinkOptions: ProducerConfig): Exch

// // // // // // // // // // // // 

// export const KafkaSource: typeof kafkaSource;
// export const KafkaSink: typeof kafkaSink;
// export const KafkaRekey: typeof kafkaRekey;
// export const KafkaCommit: typeof kafkaCommit;

// export const TumblingWindowTime: typeof tumblingWindowTime;
// export const TumblingWindowCount: typeof tumblingWindowCount;
// export const SlidingWindowTime: typeof slidingWindowTime;
// export const SlidingWindowCount: typeof slidingWindowCount;
// export const SessionWindow: typeof sessionWindow;
// export const SourceOperators: typeof sourceOperators;
// export const BaseOperators: typeof baseOperators;
// export const WindowOperators: typeof windowOperators;
// export const ArrayOperators: typeof arrayOperators;
// export const CustomOperators: typeof customOperators;
// export const SinkOperators: typeof sinkOperators;

// import task from "./src/task/task.js";
// import exchange from "./src/exchange/exchange.js";
// import { set as ExtendTaskSet } from "./src/task/extend.js";
// import { setRaw as ExtendTaskSetRaw } from "./src/task/extend.js";
// import { Make as storageMake } from "./src/storage/interface.js";
// import { ExposeStorageState as exposeStorageState } from "./src/rest/state.js";
// import kafkaClient from "./src/kafka/client.js";
// import kafkaAdmin from "./src/kafka/admin.js";
// import kafkaSource from "./src/kafka/source.js";
// import kafkaSink from "./src/kafka/sink.js";
// import kafkaRekey from "./src/kafka/rekey.js";
// import kafkaCommit from "./src/kafka/commit.js";
// import tumblingWindowTime from "./src/window/tumblingWindowTime.js";
// import tumblingWindowCount from "./src/window/tumblingWindowCount.js";
// import slidingWindowTime from "./src/window/slidingWindowTime.js";
// import slidingWindowCount from "./src/window/slidingWindowCount.js";
// import sessionWindow from "./src/window/windowSession.js";
// import * as sourceOperators from "./src/operators/source.js";
// import * as baseOperators from "./src/operators/base.js";
// import * as windowOperators from "./src/operators/window.js";
// import * as arrayOperators from "./src/operators/array.js";
// import * as customOperators from "./src/operators/custom.js";
// import * as sinkOperators from "./src/operators/sink.js";import { objectGroupBy } from "./src/operators/object.js"

type ElemOfArr<T extends any[]> = T extends (infer U)[] ? U : never;