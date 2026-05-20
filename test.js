import { fetchStockData } from './src/services/api.js';
import { runSMACrossoverBacktest } from './src/utils/backtest.js';

async function test() {
    const data = await fetchStockData('THYAO', '2y', '1d');
    console.log("Mock length:", data.data.length);
    console.log("First item:", data.data[0]);
    console.log("Second item:", data.data[1]);
    console.log("Last item:", data.data[data.data.length - 1]);

    const results = runSMACrossoverBacktest(data.data, 20, 50);
    console.log("Signals:", results.signals.slice(0, 2));

    // Check if time is strictly increasing
    let isSorted = true;
    for (let i = 1; i < data.data.length; i++) {
        if (data.data[i].time <= data.data[i - 1].time) {
            console.error("NOT SORTED AT", i, data.data[i].time, "<=", data.data[i - 1].time);
            isSorted = false;
        }
    }
    console.log("Is Sorted:", isSorted);

    // Check SMA sorted
    let isSMASorted = true;
    for (let i = 1; i < results.shortSMA.length; i++) {
        if (results.shortSMA[i].time <= results.shortSMA[i - 1].time) {
            console.error("SMA NOT SORTED AT", i);
            isSMASorted = false;
        }
    }
    console.log("Is SMA Sorted:", isSMASorted);

    let isMarkerSorted = true;
    for (let i = 1; i < results.signals.length; i++) {
        if (results.signals[i].time <= results.signals[i - 1].time) {
            console.error("MARKER NOT SORTED AT", i);
            isMarkerSorted = false;
        }
    }
    console.log("Is MARKER Sorted:", isMarkerSorted);
}

test();
