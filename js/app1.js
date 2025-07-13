window.chartSupportApp = (function() {
    // DOM要素や変数をこのスコープ内に保持
    let formElements = {};
    let adlItems = [];
    let historyList = [];
    let medSuggestions = {};
    
    // 初期化処理
    async function initialize() {
        // DOM要素の取得
        formElements = {
            name: document.getElementById('name'),
            age: document.getElementById('age'),
            genderGroup: document.getElementById('gender'),
            historyTags: document.getElementById('history-tags'),
            surgeryHistory: document.getElementById('surgery-history'),
            allergyTags: document.getElementById('allergy-tags'),
            otherAllergies: document.getElementById('other-allergies'),
            medSuggestionContainer: document.getElementById('med-suggestion-tags'),
            medListContainer: document.getElementById('medication-list'),
            addMedRowBtn: document.getElementById('add-med-row'),
            smokingStatusGroup: document.getElementById('smoking-status'),
            smokingDetailsContainer: document.getElementById('smoking-details'),
            drinkingStatusGroup: document.getElementById('drinking-status'),
            drinkingDetailsContainer: document.getElementById('drinking-details'),
            adlAssessmentContainer: document.getElementById('adl-assessment'),
            adlScoreDisplay: document.getElementById('adl-score'),
            outputMemo: document.getElementById('output-memo-app1'),
            copyBtn: document.getElementById('copy-button-app1')
        };

        adlItems = [
            { label: '食事', points: [10, 5, 0], options: ['自立', '一部介助', '全介助'] },
            { label: '移乗', points: [15, 10, 5, 0], options: ['自立', '監視/助言', '一部介助', '全介助'] },
            { label: '整容', points: [5, 0], options: ['自立', '全介助'] },
            { label: 'トイレ動作', points: [10, 5, 0], options: ['自立', '一部介助', '全介助'] },
            { label: '入浴', points: [5, 0], options: ['自立', '全介助'] },
            { label: '歩行', points: [15, 10, 5, 0], options: ['45m以上自立', '45m以上要介助', '歩行不能だが車椅子自立', '全介助'] },
            { label: '階段昇降', points: [10, 5, 0], options: ['自立', '要介助', '不能'] },
            { label: '着替え', points: [10, 5, 0], options: ['自立', '一部介助', '全介助'] },
            { label: '排便管理', points: [10, 5, 0], options: ['失禁なし', '時々失禁', '失禁あり'] },
            { label: '排尿管理', points: [10, 5, 0], options: ['失禁なし', '時々失禁', '失禁あり'] },
        ];

        try {
            const [historiesRes, medsRes] = await Promise.all([
                fetch('data/histories.json'),
                fetch('data/med_suggestions.json')
            ]);
            historyList = await historiesRes.json();
            medSuggestions = await medsRes.json();
        } catch (error) {
            console.error('設定ファイルの読み込みに失敗しました:', error);
            alert('設定ファイルの読み込みに失敗しました。');
            return;
        }

        // --- UIの構築 (初回のみ) ---
        if (formElements.historyTags.childElementCount === 0) {
            buildUI();
            addEventListeners();
        }
    }
    
    function buildUI() {
        historyList.forEach(history => {
            const button = document.createElement('button');
            button.dataset.value = history;
            button.textContent = history;
            formElements.historyTags.appendChild(button);
        });

        adlItems.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'adl-item';
            const label = document.createElement('label');
            label.textContent = item.label;
            const select = document.createElement('select');
            select.dataset.index = index;
            item.options.forEach((opt, optIndex) => {
                const option = document.createElement('option');
                option.value = item.points[optIndex];
                option.textContent = `${opt} (${option.value}点)`;
                select.appendChild(option);
            });
            div.appendChild(label);
            div.appendChild(select);
            formElements.adlAssessmentContainer.appendChild(div);
        });
    }

    function addEventListeners() {
        document.querySelector('#app1 .container-app1').addEventListener('input', updateOutput);
        document.querySelector('#app1 .container-app1').addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' && !e.target.id.includes('copy') && !e.target.id.includes('add')) {
                if(e.target.parentElement.classList.contains('button-group')) {
                    // 性別ボタンのような単一選択グループ
                    if (e.target.parentElement.id === 'gender' || e.target.parentElement.id === 'smoking-status' || e.target.parentElement.id === 'drinking-status') {
                        Array.from(e.target.parentElement.children).forEach(btn => btn.classList.remove('active'));
                    }
                    e.target.classList.toggle('active');
                }
                if(e.target.parentElement.id === 'med-suggestion-tags') {
                    toggleMedication(e.target.dataset.value);
                }
                if(e.target.parentElement.id === 'smoking-status') handleSmokingDetails(e.target);
                if(e.target.parentElement.id === 'drinking-status') handleDrinkingDetails(e.target);
                updateOutput();
            }
        });

        formElements.addMedRowBtn.addEventListener('click', () => { addMedicationRow(); updateOutput(); });
        formElements.medListContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-button')) {
                e.target.closest('.med-row').remove();
                updateOutput();
            }
        });
        formElements.copyBtn.addEventListener('click', copyToClipboard);
    }
    
    // --- データ読み込み ---
    function loadData(data) {
        data = data || {};
        
        formElements.name.value = data.name || '';
        formElements.age.value = data.age || '';
        
        // ボタンの選択状態
        setActiveButtons(formElements.genderGroup, data.gender ? [data.gender] : []);
        setActiveButtons(formElements.historyTags, data.histories || []);
        setActiveButtons(formElements.allergyTags, data.allergies ? data.allergies.split(', ') : []);
        setActiveButtons(formElements.smokingStatusGroup, data.smokingStatus ? [data.smokingStatus] : []);
        setActiveButtons(formElements.drinkingStatusGroup, data.drinkingStatus ? [data.drinkingStatus] : []);

        formElements.surgeryHistory.value = data.surgery || '';
        formElements.otherAllergies.value = data.otherAllergies || '';

        // 内服薬
        formElements.medListContainer.innerHTML = '';
        if (data.medications) {
            data.medications.forEach(med => {
                const parts = med.split(' ');
                const name = parts.shift();
                const usage = parts.join(' ');
                addMedicationRow(name, usage);
            });
        }
        
        // 生活歴詳細
        handleSmokingDetails(formElements.smokingStatusGroup.querySelector('.active'));
        if (data.smokingDetails) {
            const { years, amount } = data.smokingDetails;
            const yearsInput = document.getElementById('smoking-years');
            const amountInput = document.getElementById('smoking-amount');
            if(yearsInput) yearsInput.value = years || '';
            if(amountInput) amountInput.value = amount || '';
        }

        handleDrinkingDetails(formElements.drinkingStatusGroup.querySelector('.active'));
        if (data.drinkingDetails) {
            const { type, amount } = data.drinkingDetails;
            const typeInput = document.getElementById('drinking-type');
            const amountInput = document.getElementById('drinking-amount');
            if(typeInput) typeInput.value = type || '';
            if(amountInput) amountInput.value = amount || '';
        }
        
        // ADL
        if (data.adlSelections) {
            formElements.adlAssessmentContainer.querySelectorAll('select').forEach((select, index) => {
                select.value = data.adlSelections[index] || select.options[0].value;
            });
        } else {
            formElements.adlAssessmentContainer.querySelectorAll('select').forEach(select => {
                select.value = select.options[0].value;
            });
        }

        updateOutput();
    }
    
    // --- データ書き出し ---
    function getData() {
        const adlSelects = formElements.adlAssessmentContainer.querySelectorAll('select');
        const smokingYears = document.getElementById('smoking-years');
        const smokingAmount = document.getElementById('smoking-amount');
        const drinkingType = document.getElementById('drinking-type');
        const drinkingAmount = document.getElementById('drinking-amount');

        return {
            name: formElements.name.value,
            age: formElements.age.value,
            gender: getActiveButtonValues(formElements.genderGroup)[0],
            histories: getActiveButtonValues(formElements.historyTags),
            surgery: formElements.surgeryHistory.value,
            allergies: getActiveButtonValues(formElements.allergyTags).join(', '),
            otherAllergies: formElements.otherAllergies.value,
            medications: Array.from(formElements.medListContainer.querySelectorAll('.med-row')).map(row => {
                const name = row.querySelector('.med-name').value;
                const usage = row.querySelector('.med-usage').value;
                return `${name} ${usage}`.trim();
            }).filter(med => med),
            smokingStatus: getActiveButtonValues(formElements.smokingStatusGroup)[0],
            smokingDetails: smokingYears ? { years: smokingYears.value, amount: smokingAmount.value } : null,
            drinkingStatus: getActiveButtonValues(formElements.drinkingStatusGroup)[0],
            drinkingDetails: drinkingType ? { type: drinkingType.value, amount: drinkingAmount.value } : null,
            adlScore: calculateAdlScore(),
            adlSelections: Array.from(adlSelects).map(s => s.value)
        };
    }

    function setActiveButtons(groupElement, activeValues) {
        Array.from(groupElement.querySelectorAll('button')).forEach(btn => {
            btn.classList.toggle('active', activeValues.includes(btn.dataset.value));
        });
    }
    
    // --- 既存の関数群 (変更なし、または微修正) ---
    function getActiveButtonValues(groupElement) {
        return Array.from(groupElement.querySelectorAll('button.active')).map(btn => btn.dataset.value);
    }

    function toggleMedication(medName) {
        const existingMeds = Array.from(formElements.medListContainer.querySelectorAll('input[type="text"]')).map(input => input.value);
        if (existingMeds.includes(medName)) {
            formElements.medListContainer.querySelectorAll('.med-row').forEach(row => {
                if (row.querySelector('input[type="text"]').value === medName) {
                    row.remove();
                }
            });
        } else {
            addMedicationRow(medName);
        }
        updateOutput();
    }
    
    function addMedicationRow(name = '', usage = '') {
        const div = document.createElement('div');
        div.className = 'med-row';
        div.innerHTML = `
            <input type="text" class="med-name" placeholder="薬剤名" value="${name}">
            <input type="text" class="med-usage" placeholder="用法・用量" value="${usage}">
            <button class="delete-button">×</button>
        `;
        div.querySelector('.med-name').addEventListener('input', updateOutput);
        div.querySelector('.med-usage').addEventListener('input', updateOutput);
        formElements.medListContainer.appendChild(div);
    }
    
    function handleSmokingDetails(targetButton) {
        const value = targetButton ? targetButton.dataset.value : null;
        const isActive = targetButton ? targetButton.classList.contains('active') : false;

        if(!isActive || value === 'なし') {
             formElements.smokingDetailsContainer.innerHTML = '';
        } else if (formElements.smokingDetailsContainer.innerHTML === '') {
            formElements.smokingDetailsContainer.innerHTML = `
                <input type="number" id="smoking-years" placeholder="年数"> 年間
                <input type="number" id="smoking-amount" placeholder="本数"> 本/日
            `;
            formElements.smokingDetailsContainer.querySelector('#smoking-years').addEventListener('input', updateOutput);
            formElements.smokingDetailsContainer.querySelector('#smoking-amount').addEventListener('input', updateOutput);
        }
    }
    
    function handleDrinkingDetails(targetButton) {
        const value = targetButton ? targetButton.dataset.value : null;
        const isActive = targetButton ? targetButton.classList.contains('active') : false;
        
        if(!isActive || value === 'なし') {
            formElements.drinkingDetailsContainer.innerHTML = '';
        } else if (formElements.drinkingDetailsContainer.innerHTML === '') {
            formElements.drinkingDetailsContainer.innerHTML = `
                <input type="text" id="drinking-type" placeholder="種類（ビール, 日本酒など）">
                <input type="text" id="drinking-amount" placeholder="量（350ml/日など）">
            `;
            formElements.drinkingDetailsContainer.querySelector('#drinking-type').addEventListener('input', updateOutput);
            formElements.drinkingDetailsContainer.querySelector('#drinking-amount').addEventListener('input', updateOutput);
        }
    }

    function calculateAdlScore() {
        let total = 0;
        formElements.adlAssessmentContainer.querySelectorAll('select').forEach(select => {
            total += Number(select.value);
        });
        const scoreText = `ADL合計: ${total} / 100点`;
        if (formElements.adlScoreDisplay) {
            formElements.adlScoreDisplay.textContent = scoreText;
        }
        return total;
    }

    function updateMedSuggestions(histories) {
        formElements.medSuggestionContainer.innerHTML = '';
        const suggestions = new Set();
        (histories || []).forEach(history => {
            if(medSuggestions[history]) {
                medSuggestions[history].forEach(med => suggestions.add(med));
            }
        });
        
        suggestions.forEach(med => {
            const btn = document.createElement('button');
            btn.dataset.value = med;
            btn.textContent = med;
            formElements.medSuggestionContainer.appendChild(btn);
        });
    }

    function updateOutput() {
        const values = getData(); // 現在のフォームの状態からデータを取得

        updateMedSuggestions(values.histories);
        calculateAdlScore();

        let smokingText = values.smokingStatus || '未選択';
        if (values.smokingDetails) {
            const { years, amount } = values.smokingDetails;
            smokingText += ` (${amount || '?'}本/日 x ${years || '?'}年)`;
        }
        
        let drinkingText = values.drinkingStatus || '未選択';
        if (values.drinkingDetails) {
            const { type, amount } = values.drinkingDetails;
            drinkingText += ` (${type || '?'}を${amount || '?'})`;
        }

        const output = `
【患者情報】
氏名：${values.name || '未入力'} 様
年齢：${values.age || '未入力'} 歳
性別：${values.gender || '未選択'}

【既往歴】
・${(values.histories && values.histories.length > 0) ? values.histories.join('、') : '特記事項なし'}
${values.surgery ? '・手術歴/特記事項：' + values.surgery : ''}

【内服薬】
${(values.medications && values.medications.length > 0) ? values.medications.map(m => `・${m}`).join('\n') : '・なし'}

【アレルギー】
・${values.allergies || '特になし'}
${values.otherAllergies ? '・その他：' + values.otherAllergies : ''}

【生活歴】
喫煙：${smokingText}
飲酒：${drinkingText}

【ADL】
Barthel Index: ${values.adlScore}点
        `.trim();

        if (formElements.outputMemo) {
            formElements.outputMemo.value = output;
        }
    }

    function copyToClipboard() {
        if (!navigator.clipboard) {
            formElements.outputMemo.select();
            document.execCommand('copy');
        } else {
            navigator.clipboard.writeText(formElements.outputMemo.value).catch(err => {
                console.error('クリップボードへのコピーに失敗しました: ', err);
            });
        }
        formElements.copyBtn.textContent = 'コピーしました！';
        setTimeout(() => {
            formElements.copyBtn.textContent = 'クリップボードにコピー';
        }, 1500);
    }

    // 公開するAPI
    return {
        initialize,
        loadData,
        getData
    };
})();