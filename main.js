document.addEventListener('DOMContentLoaded', () => {
    // State management
    const state = {
        // List of all available items
        items: [],
        // List of all finalized transactions
        transactions: [],
        // Minimum support threshold
        minSupport: 0.3,

        // Currently selected transaction to be added
        currentTransaction: [],
    };

    // DOM Elements
    const elements = {
        itemInput: document.getElementById('item-name'),
        addItemBtn: document.getElementById('add-item'),
        itemsContainer: document.getElementById('items-container'),
        currentTransactionContainer: document.getElementById('current-transaction'),
        addTransactionBtn: document.getElementById('add-transaction'),
        clearSelectionBtn: document.getElementById('clear-selection'),
        transactionsContainer: document.getElementById('transactions-container'),
        jsonUpload: document.getElementById('json-upload'),
        uploadBtn: document.getElementById('upload-btn'),
        minSupportInput: document.getElementById('min-support'),
        runAlgorithmBtn: document.getElementById('run-algorithm'),
        resetAllBtn: document.getElementById('reset-all'),
        ppcTree: document.getElementById('ppc-tree'),
        frequentPatterns: document.getElementById('frequent-patterns'),
        nListContainer: document.getElementById('n-list-container')
    };


    // Event listeners
    setupEventListeners();

    // Initialize with sample data for testing
    loadSampleData();


    function setupEventListeners() {
        // Add new item
        elements.addItemBtn.addEventListener('click', addItem);
        elements.itemInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') addItem();
        });

        // Transaction management
        elements.addTransactionBtn.addEventListener('click', addTransaction);
        elements.clearSelectionBtn.addEventListener('click', clearSelection);

        // File import
        elements.uploadBtn.addEventListener('click', handleFileUpload);

        // Algorithm control
        elements.minSupportInput.addEventListener('change', e => {
            state.minSupport = parseFloat(e.target.value);
        });
        elements.runAlgorithmBtn.addEventListener('click', runPrePostAlgorithm);
        elements.resetAllBtn.addEventListener('click', resetAll);
    }

    function addItem() {
        const itemName = elements.itemInput.value.trim();
        if (itemName && !state.items.includes(itemName)) {
            state.items.push(itemName);
            renderItems();
            elements.itemInput.value = '';
        }
    }

    function renderItems() {
        elements.itemsContainer.innerHTML = '';
        state.items.forEach(item => {
            const itemChip = document.createElement('div');
            itemChip.className = 'item-chip';
            itemChip.textContent = item;
            itemChip.dataset.item = item;

            if (state.currentTransaction.includes(item)) {
                itemChip.classList.add('selected');
            }

            itemChip.addEventListener('click', () => toggleItemSelection(item));
            elements.itemsContainer.appendChild(itemChip);
        });
    }

    function toggleItemSelection(item) {
        const index = state.currentTransaction.indexOf(item);
        if (index > -1) {
            state.currentTransaction.splice(index, 1);
        } else {
            state.currentTransaction.push(item);
        }
        renderCurrentTransaction();
        renderItems(); // Update selected state
    }

    function renderCurrentTransaction() {
        elements.currentTransactionContainer.innerHTML = '';
        state.currentTransaction.forEach(item => {
            const itemChip = document.createElement('div');
            itemChip.className = 'item-chip selected';
            itemChip.textContent = item;
            elements.currentTransactionContainer.appendChild(itemChip);
        });
    }

    function addTransaction() {
        if (state.currentTransaction.length > 0) {
            // Sort items to maintain consistency
            const sortedTransaction = [...state.currentTransaction].sort();
            state.transactions.push(sortedTransaction);
            state.currentTransaction = [];
            renderTransactions();
            renderCurrentTransaction();
            renderItems();
        }
    }

    function renderTransactions() {
        elements.transactionsContainer.innerHTML = '';
        state.transactions.forEach((transaction, index) => {
            const transactionElement = document.createElement('div');
            transactionElement.className = 'transaction-item';
            transactionElement.textContent = `T${index + 1}: ${transaction.join(', ')}`;

            const removeBtn = document.createElement('span');
            removeBtn.className = 'remove-btn';
            removeBtn.textContent = '×';
            removeBtn.addEventListener('click', () => removeTransaction(index));

            transactionElement.appendChild(removeBtn);
            elements.transactionsContainer.appendChild(transactionElement);
        });
    }

    function removeTransaction(index) {
        state.transactions.splice(index, 1);
        renderTransactions();
    }

    function clearSelection() {
        state.currentTransaction = [];
        renderCurrentTransaction();
        renderItems();
    }

    function handleFileUpload() {
        const fileInput = elements.jsonUpload;
        const file = fileInput.files[0];

        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    const data = JSON.parse(e.target.result);
                    if (data.items && Array.isArray(data.items) &&
                        data.transactions && Array.isArray(data.transactions)) {

                        state.items = data.items;
                        state.transactions = data.transactions;

                        renderItems();
                        renderTransactions();

                        alert('Data loaded successfully!');
                    } else {
                        alert('Invalid JSON format. Expected {items: [...], transactions: [...]}');
                    }
                } catch (error) {
                    alert('Error parsing JSON: ' + error.message);
                }
            };
            reader.readAsText(file);
        }
    }

    function resetAll() {
        state.items = [];
        state.transactions = [];
        state.currentTransaction = [];

        renderItems();
        renderCurrentTransaction();
        renderTransactions();
        elements.ppcTree.innerHTML = '';
        elements.frequentPatterns.textContent = '';
        elements.nListContainer.innerHTML = '';
    }


    function runPrePostAlgorithm() {
        if (state.transactions.length === 0) {
            alert('Please add some transactions first.');
            return;
        }

        const minSupportCount = Math.ceil(state.minSupport * state.transactions.length);

        // Step 1: Scan the database to find frequent 1-itemsets
        const itemCounts = countItems(state.transactions);
        const orderedFrequentItems = Object.entries(itemCounts)
            .filter(([_, count]) => count >= minSupportCount)
            .sort((tupleA, tupleB) => {
                const [itemA, countA] = tupleA;
                const [itemB, countB] = tupleB;
                return countB - countA || state.items.indexOf(itemA) - state.items.indexOf(itemB);
            })
            .map(([item]) => item);

        if (orderedFrequentItems.length === 0) {
            alert('No frequent items found with the current minimum support.');
            return;
        }

        // Step 2: Build the PPC-Tree
        const ppcTree = buildPPCTree(orderedFrequentItems, state.transactions);
        // Step 3: Build the N-List
        const nList = buildNList(ppcTree);
        const orderedNList = orderedFrequentItems.map(itemName => nList[itemName]);

        // Step 4: Mine the PPC-Tree
        const frequentPatterns = mineFrequentPatterns(orderedNList, minSupportCount);
        displayFrequentPatterns(frequentPatterns);

        // Visualize the results
        visualizePPCTree(ppcTree);
        visualizeNList(frequentPatterns, orderedFrequentItems);
    }

    function countItems(transactions) {
        const counts = {};
        for (const t of transactions.flat()) {
            counts[t] = (counts[t] || 0) + 1;
        }
        return counts;
    }

    function buildPPCTree(orderedFrequentItems, transactions) {
        const itemOrder = {};
        orderedFrequentItems.forEach((item, index) => {
            itemOrder[item] = index;
        });

        // Initialize the tree with a root node
        const root = {
            name: "root",
            children: [],
            count: 0,
            preOrder: -1,
            postOrder: -1,
        };

        // Insert each transaction into the tree
        transactions.forEach(transaction => {
            const sortedItems = orderedFrequentItems
                .filter(item => transaction.includes(item));
            if (sortedItems.length > 0) {
                insertTransaction(root, sortedItems);
            }
        });

        // Assign pre-order and post-order numbers
        let preOrder = 0;
        let postOrder = 0;
        const assignPrePostOrder = (node) => {
            node.preOrder = preOrder++;
            node.children.forEach(child => assignPrePostOrder(child));
            node.postOrder = postOrder++;
        }
        assignPrePostOrder(root);

        return {
            root: root,
        };
    }

    function insertTransaction(node, items) {
        if (items.length === 0) return;

        const currentItem = items[0];
        let child = node.children.find(n => n.name === currentItem);

        if (!child) {
            child = {
                name: currentItem,
                children: [],
                count: 0,
                parent: node,
                preOrder: -1,
                postOrder: -1,
            };
            node.children.push(child);
        }

        child.count += 1;

        if (items.length > 1) {
            insertTransaction(child, items.slice(1));
        }
    }

    function buildNList(ppcTree) {
        const nList = {};

        const traverse = (node) => {
            if (node.name != "root") {
                if (!nList[node.name]) {
                    nList[node.name] = [];
                }
                nList[node.name].push({
                    name: node.name,
                    count: node.count,
                    preOrder: node.preOrder,
                    postOrder: node.postOrder,
                });
            }
            node.children.forEach(traverse);
        }
        traverse(ppcTree.root);

        for (const item in nList) {
            nList[item].sort((a, b) => a.preOrder - b.preOrder);
        }

        return nList;
    }

    function mineFrequentPatterns(orderedNList, minSupportCount) {
        const patterns = {};

        // Mine frequent patterns of 1-itemsets
        patterns[1] = new Map();
        for (const entries of orderedNList) {
            const itemName = entries[0].name;
            patterns[1].set(new Set([itemName]), Array.from(entries));
        }

        const combinations = (arr, k) => {
            const result = [];
            const f = (prefix, remainArr) => {
                if (prefix.length === k) {
                    result.push(new Set(prefix));
                    return;
                }
                for (let i = 0; i < remainArr.length; i++) {
                    f([...prefix, remainArr[i]], remainArr.slice(i + 1));
                }
            };
            f([], arr);
            return result;
        }

        const itemSetExists = (itemSet, itemSets) => {
            for (const existingSet of itemSets) {
                if (itemSet.size === existingSet.size
                    && [...itemSet].every(item => existingSet.has(item))) {
                    return true;
                }
            }
            return false;
        }

        // Mine frequent patterns of k-itemsets
        for (let k = 2; k <= patterns[1].size; k++) {
            const newPatterns = new Map();
            const frequentItems = Array.from(patterns[k - 1].keys());
            const candidateSets = combinations(frequentItems, 2);

            for (const candidate of candidateSets) {
                const [itemA, itemB] = Array.from(candidate);
                const entriesA = patterns[k - 1].get(itemA);
                const entriesB = patterns[k - 1].get(itemB);

                const candidateItem = new Set([...itemA, ...itemB].sort((a, b) => a.localeCompare(b)));
                if (candidateItem.size !== k) continue;

                if (entriesA && entriesB) {
                    const mergedEntries = [];
                    for (const entryA of entriesA) {
                        let totalCount = 0;
                        for (const entryB of entriesB) {
                            if (entryA.preOrder < entryB.preOrder
                                && entryA.postOrder > entryB.postOrder) {
                                totalCount += entryB.count;
                            }
                        }
                        if (totalCount > 0) {
                            mergedEntries.push({
                                count: totalCount,
                                preOrder: entryA.preOrder,
                                postOrder: entryA.postOrder,
                            });
                        }
                    }
                    if (mergedEntries.length > 0
                        && mergedEntries.reduce((sum, entry) => sum + entry.count, 0) >= minSupportCount
                        && !itemSetExists(candidateItem, newPatterns.keys())) {
                        newPatterns.set(candidateItem, mergedEntries);
                    }
                    mergedEntries.sort((a, b) => a.preOrder - b.preOrder);
                }
            }

            if (newPatterns.size === 0) {
                break;
            }
            patterns[k] = newPatterns;
        }
        return Object.entries(patterns);
    }

    function displayFrequentPatterns(frequentPatterns) {
        const countTotalPatterns = (nList) => {
            let count = 0;
            for (const [k, patterns] of nList) {
                count += patterns.size;
            }
            return count;
        }

        let resultText = `(${state.minSupport * 100}% support) Recommended ${countTotalPatterns(frequentPatterns)} combos:\n`
            + `(Stand-alone item is popular item)\n`
            + `\n\n`;
        for (const [k, patterns] of frequentPatterns) {
            for (const [itemSet, entries] of patterns) {
                const itemName = Array.from(itemSet).join(', ');
                resultText += `  + ${itemName}\n`;
            }
        }
        elements.frequentPatterns.textContent = resultText;
    }


    function visualizePPCTree(ppcTree) {
        elements.ppcTree.innerHTML = '';

        // Using D3.js for visualization
        const width = elements.ppcTree.clientWidth;
        const height = elements.ppcTree.clientHeight;

        const svg = d3.select('#ppc-tree')
            .append('svg')
            .attr('width', width)
            .attr('height', height);

        const g = svg.append('g')
            .attr('transform', `translate(${width / 2}, 40)`);

        // Create hierarchy
        const root = d3.hierarchy(ppcTree.root);

        // Create tree layout
        const treeLayout = d3.tree().size([width / 2, height - 100]);

        // Apply layout
        treeLayout(root);

        // Add links
        g.selectAll('.link')
            .data(root.links())
            .enter()
            .append('path')
            .attr('class', 'link')
            .attr('d', d3.linkVertical()
                .x(d => d.x)
                .y(d => d.y));

        // Add nodes
        const nodes = g.selectAll('.node')
            .data(root.descendants())
            .enter()
            .append('g')
            .attr('class', 'node')
            .attr('transform', d => `translate(${d.x},${d.y})`);

        // Add circles to nodes
        nodes.append('circle')
            .attr('r', 5);

        // Add labels to nodes
        nodes.append('text')
            .attr('dy', '.35em')
            .attr('y', d => d.children ? -15 : 15)
            .style('text-anchor', 'middle')
            .text(d => d.data.name !== 'root'
                ? `${d.data.name}(${d.data.count}) <${d.data.preOrder};${d.data.postOrder}>`
                : `<${d.data.preOrder};${d.data.postOrder}>`);
    }

    function visualizeNList(nList, orderedFrequentItems) {
        elements.nListContainer.innerHTML = '';
        const container = elements.nListContainer;

        for (const kPatterns of nList) {
            const [k, patterns] = kPatterns;
            for (const [itemSet, entries] of patterns) {
                const itemName = '{' + Array.from(itemSet).join(', ') + '}';

                const itemDiv = document.createElement('div');
                itemDiv.className = 'n-list-item';
                itemDiv.textContent = `Item: ${itemName}`;

                const entriesDiv = document.createElement('div');
                entriesDiv.className = 'n-list-entries';

                const entriesText = entries.map(node =>
                    `<(${node.preOrder}, ${node.postOrder}): ${node.count}>`
                ).join('\n');

                entriesDiv.textContent = entriesText;

                itemDiv.appendChild(entriesDiv);
                container.appendChild(itemDiv);
            }
        }
    }

    function loadSampleData() {
        state.items = [
            "Milk",
            "Bread",
            "Eggs",
            "Cheese",
            "Butter",
            "Yogurt",
            "Chicken",
            "Fish",
            "Rice",
            "Pasta",
            "Tomatoes",
        ];
        state.transactions = [
            ["Milk", "Bread", "Eggs"],
            ["Milk", "Cheese"],
            ["Bread", "Butter"],
            ["Eggs", "Yogurt"],
            ["Chicken", "Fish"],
            ["Rice", "Pasta", "Tomatoes"],
            ["Milk", "Bread", "Rice"],
        ];

        renderItems();
        renderTransactions();
    }
});
