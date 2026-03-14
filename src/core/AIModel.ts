import * as tf from '@tensorflow/tfjs';

export class AIModel {
    private model!: tf.Sequential;
    private windowSize: number = 60;
    private trained: boolean = false;

    constructor() {
        this.initModel();
    }

    isTrained(): boolean {
        return this.trained;
    }

    private initModel() {
        this.model = tf.sequential();

        this.model.add(tf.layers.lstm({
            units: 64,
            returnSequences: true,
            inputShape: [this.windowSize, 5]
        }));

        this.model.add(tf.layers.dropout({ rate: 0.2 }));

        this.model.add(tf.layers.lstm({
            units: 32,
            returnSequences: false
        }));

        this.model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
        this.model.add(tf.layers.dense({ units: 1 }));

        this.model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'meanSquaredError'
        });
    }

    async predict(candles: any[]): Promise<number> {
        if (candles.length < this.windowSize) return 0;
        // Si el modelo no ha sido entrenado, devolver precio actual (neutral) para no sesgar la señal
        if (!this.trained) {
            return candles[candles.length - 1].close;
        }

        const lastWindow = candles.slice(-this.windowSize).map(c => [
            c.open, c.high, c.low, c.close, Number(c.volume)
        ]);

        const input = tf.tensor3d([lastWindow]);
        const prediction = this.model.predict(input) as tf.Tensor;
        const result = (await prediction.data())[0];

        input.dispose();
        prediction.dispose();

        return result;
    }

    async train(historicalCandles: any[]) {
        if (historicalCandles.length <= this.windowSize) return;

        const { inputs, labels } = this.prepareData(historicalCandles);

        const history = await this.model.fit(inputs, labels, {
            epochs: 5,
            batchSize: 32,
            verbose: 0
        });

        this.trained = true;
        inputs.dispose();
        labels.dispose();

        return history;
    }

    private prepareData(candles: any[]) {
        const inputs: number[][][] = [];
        const labels: number[] = [];

        for (let i = 0; i < candles.length - this.windowSize; i++) {
            const window = candles.slice(i, i + this.windowSize).map(c => [
                c.open, c.high, c.low, c.close, Number(c.volume)
            ]);
            inputs.push(window);
            labels.push(candles[i + this.windowSize].close);
        }

        return {
            inputs: tf.tensor3d(inputs),
            labels: tf.tensor2d(labels, [labels.length, 1])
        };
    }
}
