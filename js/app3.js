window.bloodTestApp = (function() {
    // DOM要素
    let form, itemsContainer, dataList, patientIdInput;

    // アプリの状態
    let testItemsDefinition = [];
    let records = []; // この患者の採血記録
    let inputOrder = [];

    // 初期化
    async function initialize() {
        form = document.getElementById('input-form-app3');
        itemsContainer = document.getElementById('test-items-container-app3');
        dataList = document.getElementById('data-list-app3');
        patientIdInput = document.getElementById('patient-id-app3');

        try {
            const response = await fetch('data/test_items.json');
            if (!response.ok) throw new Error('Network response was not ok');
            testItemsDefinition = await response.json();
            
            // UIの構築 (初回のみ)
            if (itemsContainer.childElementCount === 0) {
                setupApplicationUI();
                addEventListeners();
            }
        } catch (error) {
            console.error('検査項目の読み込みに失敗しました:', error);
            if(itemsContainer) {
                itemsContainer.innerHTML = `<p style="color: red;">検査項目の定義ファイル(test_items.json)の読み込みに失敗しました。</p>`;
            }
        }
    }

    // データ読み込み
    function loadData(data) {
        data = data || {};
        records = data.records || [];
        // 患者IDは、App1で入力された氏名などから自動生成・取得するのが望ましいが、ここでは簡易的にIDを渡す
        const patientName = window.chartSupportApp.getData().name || "Unknown";
        patientIdInput.value = `Patient: ${patientName}`;
        renderDataList();
    }

    // データ書き出し
    function getData() {
        return {
            records: records
        };
    }
    
    function setupApplicationUI() {
        const categories = [...new Set(testItemsDefinition.map(item => item.category))];

        categories.forEach(category => {
            const categoryItems = testItemsDefinition.filter(item => item.category === category);
            const isAlwaysVisible = ['血算', '生化学', '電解質'].includes(category);
            const header = document.createElement(isAlwaysVisible ? 'h2' : 'button');
            header.textContent = category;
            if (!isAlwaysVisible) {
                header.className = 'accordion-header';
                header.type = 'button';
            }
            itemsContainer.appendChild(header);

            const content = document.createElement('div');
            content.className = isAlwaysVisible ? '' : 'accordion-content';
            itemsContainer.appendChild(content);

            const grid = document.createElement('div');
            grid.className = 'category-grid';
            content.appendChild(grid);
            
            if (category === '電解質') {
                const alwaysVisibleGrid = document.createElement('div');
                alwaysVisibleGrid.className = 'category-grid';
                content.appendChild(alwaysVisibleGrid);

                const accordionHeader = document.createElement('button');
                accordionHeader.type = 'button';
                accordionHeader.className = 'accordion-header';
                accordionHeader.textContent = 'その他 (Ca, P, Mg)';
                accordionHeader.style.marginTop = '10px';
                content.appendChild(accordionHeader);
                
                const accordionContent = document.createElement('div');
                accordionContent.className = 'accordion-content';
                content.appendChild(accordionContent);
                
                const collapsibleGrid = document.createElement('div');
                collapsibleGrid.className = 'category-grid';
                accordionContent.appendChild(collapsibleGrid);

                categoryItems.forEach(item => {
                    const targetGrid = item.alwaysVisible ? alwaysVisibleGrid : collapsibleGrid;
                    createInputItem(item, targetGrid);
                });
            } else {
                categoryItems.forEach(item => createInputItem(item, grid));
            }
        });
        
        const testDateInput = document.getElementById('test-date-app3');
        if (testDateInput) {
            testDateInput.valueAsDate = new Date();
        }
    }

    function addEventListeners() {
        itemsContainer.querySelectorAll('.accordion-header').forEach(button => {
            button.addEventListener('click', () => {
                button.classList.toggle('active');
                const content = button.nextElementSibling;
                content.style.maxHeight = content.style.maxHeight ? null : content.scrollHeight + "px";
            });
        });

        form.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
                e.preventDefault();
                const currentIndex = inputOrder.findIndex(input => input.id === e.target.id);
                const nextInput = inputOrder[currentIndex + 1];
                if (nextInput) nextInput.focus();
                else document.getElementById('memo-app3').focus();
            }
        });

        itemsContainer.addEventListener('keydown', handleArrowKeys);
        itemsContainer.addEventListener('input', handleInput);
        
        // ★★★ クリックで自動入力するイベントリスナーを追加 ★★★ここと、、、
        itemsContainer.addEventListener('click', handleAutoFillOnClick);
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const data = {
                id: Date.now(),
                testDate: document.getElementById('test-date-app3').value,
                memo: document.getElementById('memo-app3').value,
                results: {}
            };
            testItemsDefinition.forEach(item => {
                const input = document.getElementById(`app3-${item.id}`);
                if(input && input.value !== '') {
                    data.results[item.id] = input.value;
                }
            });
            records.push(data);
            renderDataList();
            form.reset();
            document.querySelectorAll('#app3 input.abnormal').forEach(el => el.classList.remove('abnormal'));
            document.getElementById('test-date-app3').valueAsDate = new Date();
        });
        
        dataList.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-button')) {
                if (confirm('このデータを削除してもよろしいですか？')) {
                    const idToDelete = Number(e.target.dataset.id);
                    records = records.filter(data => data.id !== idToDelete);
                    renderDataList();
                }
            }
        });
    }

    function createInputItem(item, parentElement) {
        const group = document.createElement('div');
        group.className = 'item-group';
        const label = document.createElement('label');
        label.htmlFor = `app3-${item.id}`;
        label.textContent = `${item.name} (${item.unit})`;
        group.appendChild(label);
        const input = document.createElement('input');
        input.type = 'number';
        input.id = `app3-${item.id}`;
        input.step = item.step;
        input.dataset.itemId = item.id;
        group.appendChild(input);
        const refValue = document.createElement('div');
        refValue.className = 'reference-value';
        refValue.textContent = `基準値: ${item.min} - ${item.max}`;
        group.appendChild(refValue);
        parentElement.appendChild(group);
        inputOrder.push(input);
    }
    
    // ★★★ 自動入力の処理 ★★★、、、ここを削除すればクリック時の入力欄は空欄のまま
    function handleAutoFillOnClick(e) {
        const input = e.target;
        if (input.type === 'number' && !input.value) {
            const item = findItemById(input.dataset.itemId);
            if (item) {
                input.value = item.min; // 基準値の下限を入力
                checkAbnormality(input, item);
                // イベントの伝播を止めて、意図しない動作を防ぐ
                e.stopPropagation(); 
            }
        }
    }

    /////まだうまくいっていない部分/////
   function handleArrowKeys(e) {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const input = e.target;
        if (input.type === 'number') {
            e.preventDefault();
            const item = findItemById(input.dataset.itemId);
            if (!item) return;

            // ★★★ 正しいロジックに修正 ★★★
            if (input.value === '') {
                // 1. 入力欄が空の場合、最初のキー入力で「下限値」をセットする
                input.value = item.min;
            } else {
                // 2. 入力欄に既に値がある場合、その値を基準に増減させる
                let value = parseFloat(input.value);
                const step = item.step || 1;
                // 小数点以下の桁数を取得して精度を保つ
                const precision = (step.toString().split('.')[1] || []).length;

                if (e.key === 'ArrowUp') {
                    value += step;
                } else if (e.key === 'ArrowDown') {
                    value -= step;
                }
                input.value = parseFloat(value.toFixed(precision));
            }

            // 値の変更後に、正常値かどうかをチェックする
            checkAbnormality(input, item);
        }
    }
}
    

    function handleInput(e) {
        const input = e.target;
         if (input.type === 'number') {
            const item = findItemById(input.dataset.itemId);
            if(item) checkAbnormality(input, item);
         }
    }

    function findItemById(id) {
        return testItemsDefinition.find(item => item.id === id);
    }

    function checkAbnormality(input, item) {
        const value = parseFloat(input.value);
        if (isNaN(value)) {
            input.classList.remove('abnormal');
            return;
        }
        input.classList.toggle('abnormal', value < item.min || value > item.max);
    }

    function renderDataList() {
        dataList.innerHTML = '';
        const sortedData = [...records].sort((a, b) => new Date(b.testDate) - new Date(a.testDate));
        
        sortedData.forEach(data => {
            const record = document.createElement('div');
            record.className = 'data-record';
            let resultsHtml = '';
            
            const categories = [...new Set(testItemsDefinition.map(item => item.category))];
            categories.forEach(category => {
                const categoryItems = testItemsDefinition.filter(item => item.category === category);
                const resultsInCategory = categoryItems
                    .map(item => {
                        const resultValue = data.results[item.id];
                        if (resultValue) {
                            const value = parseFloat(resultValue);
                            const isAbnormal = value < item.min || value > item.max;
                            return `<li ${isAbnormal ? 'style="color: red; font-weight: bold;"' : ''}>${item.name}: ${resultValue} ${item.unit}</li>`;
                        }
                        return '';
                    })
                    .join('');

                if (resultsInCategory) {
                    resultsHtml += `<div><strong>${category}</strong><ul>${resultsInCategory}</ul></div>`;
                }
            });

            record.innerHTML = `
                <button class="delete-button" data-id="${data.id}">&times;</button>
                <h3>検査日: ${data.testDate}</h3>
                <div class="data-record-grid">${resultsHtml}</div>
                ${data.memo ? `<p><strong>メモ:</strong> ${data.memo}</p>` : ''}
            `;
            dataList.appendChild(record);
        });
    }
    
    // 公開API
    return {
        initialize,
        loadData,
        getData
    };
})();