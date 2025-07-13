document.addEventListener('DOMContentLoaded', () => {
    // ===== Global Elements =====
    const appHeader = document.querySelector('.app-header');
    const navContainer = document.getElementById('app-nav');
    const contentContainers = document.querySelectorAll('.app-content');
    const navButtons = document.querySelectorAll('.nav-button');
    const patientSelect = document.getElementById('patient-select');
    const newPatientBtn = document.getElementById('new-patient-btn');
    const saveBtn = document.getElementById('save-btn');

    // ===== Patient Data Management =====
    let patients = {};
    let activePatientId = null;
    let initializedApps = new Set();
    
    // アプリのインターフェースを定義
    const appInterfaces = {
        app1: window.chartSupportApp,
        app2: window.diagnosisSupportApp,
        app3: window.bloodTestApp,
        app4: window.integrationApp
    };

    function loadPatients() {
        const storedPatients = localStorage.getItem('medicalAppPatients');
        const storedActiveId = localStorage.getItem('medicalAppActivePatientId');
        if (storedPatients) {
            patients = JSON.parse(storedPatients);
            activePatientId = storedActiveId;
        }
        if (!activePatientId || !patients[activePatientId]) {
            // 有効な患者がいない場合は新規作成
            createNewPatient();
        }
    }

    function savePatients() {
        if (!activePatientId) return;
        // 現在のアプリのデータを集約
        Object.keys(appInterfaces).forEach(appId => {
            if (initializedApps.has(appId) && appInterfaces[appId] && typeof appInterfaces[appId].getData === 'function') {
                patients[activePatientId][appId] = appInterfaces[appId].getData();
            }
        });
        localStorage.setItem('medicalAppPatients', JSON.stringify(patients));
        localStorage.setItem('medicalAppActivePatientId', activePatientId);
        
        // 患者名が更新されている可能性があるのでセレクタを再描画
        renderPatientSelector();

        // 保存ボタンのフィードバック
        const originalText = saveBtn.textContent;
        saveBtn.textContent = '保存しました!';
        saveBtn.style.backgroundColor = '#218838';
        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.style.backgroundColor = '#28a745';
        }, 2000);
    }

    function createNewPatient() {
        const newId = `patient_${Date.now()}`;
        const patientCount = Object.keys(patients).length + 1;
        patients[newId] = {
            id: newId,
            name: `患者 ${patientCount}`,
            createdAt: new Date().toISOString(),
            // 各アプリの初期データを設定
            app1: {},
            app2: { selectionOrder: [], selectedKeywords: [], recordedDiagnoses: [], pinnedItems: {} },
            app3: { records: [] },
            app4: {}
        };
        activePatientId = newId;
        switchPatient(newId);
        savePatients();
    }

    function switchPatient(patientId) {
        if (!patients[patientId]) return;
        activePatientId = patientId;
        localStorage.setItem('medicalAppActivePatientId', activePatientId);
        
        updateHeaderColor();
        renderPatientSelector();

        // 現在表示中のアプリの内容を更新
        const activeAppId = document.querySelector('.app-content.active').id;
        updateAppContent(activeAppId);
    }
    
    function updateAppContent(appId) {
        if (!initializedApps.has(appId)) {
            if (appInterfaces[appId] && typeof appInterfaces[appId].initialize === 'function') {
                appInterfaces[appId].initialize();
            }
            initializedApps.add(appId);
        }
        
        if (appInterfaces[appId] && typeof appInterfaces[appId].loadData === 'function') {
            const patientData = patients[activePatientId] || {};
            appInterfaces[appId].loadData(patientData[appId] || {});
        }
        
        // App4は常に全データを参照するので特別扱い
        if (appId === 'app4' && appInterfaces.app4 && typeof appInterfaces.app4.loadData === 'function') {
            appInterfaces.app4.loadData(getAllDataForActivePatient());
        }
    }

    // App1~3のデータを統合してApp4に渡す
    function getAllDataForActivePatient() {
        if (!activePatientId) return {};
        
        const activePatient = patients[activePatientId];
        const app1Data = appInterfaces.app1.getData ? appInterfaces.app1.getData() : activePatient.app1;
        const app2Data = appInterfaces.app2.getData ? appInterfaces.app2.getData() : activePatient.app2;
        const app3Data = appInterfaces.app3.getData ? appInterfaces.app3.getData() : activePatient.app3;

        return {
            app1: app1Data,
            app2: app2Data,
            app3: app3Data
        };
    }


    function renderPatientSelector() {
        patientSelect.innerHTML = '';
        const sortedPatients = Object.values(patients).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        sortedPatients.forEach(patient => {
            const option = document.createElement('option');
            option.value = patient.id;
            // app1のデータから名前を取得、なければデフォルト名
            const patientName = (patient.app1 && patient.app1.name) ? patient.app1.name : patient.name;
            option.textContent = patientName;
            if (patient.id === activePatientId) {
                option.selected = true;
            }
            patientSelect.appendChild(option);
        });
    }
    
    function generatePatientColor(patientId) {
        if (!patientId) return '#005a9c';
        let hash = 0;
        for (let i = 0; i < patientId.length; i++) {
            hash = patientId.charCodeAt(i) + ((hash << 5) - hash);
        }
        let color = '#';
        for (let i = 0; i < 3; i++) {
            let value = (hash >> (i * 8)) & 0xFF;
            // 暗めの色相を生成するため、値を調整
            value = Math.floor(value * 0.5 + 30); 
            color += ('00' + value.toString(16)).substr(-2);
        }
        return color;
    }

    function updateHeaderColor() {
        appHeader.style.backgroundColor = generatePatientColor(activePatientId);
    }


    // ===== Event Listeners =====
    navContainer.addEventListener('click', (e) => {
        if (e.target.matches('.nav-button')) {
            const targetId = e.target.dataset.target;
            
            // アプリ切り替え前に現在のデータを保存
            savePatients();

            contentContainers.forEach(c => c.classList.remove('active'));
            navButtons.forEach(b => b.classList.remove('active'));
            
            const targetContainer = document.getElementById(targetId);
            targetContainer.classList.add('active');
            e.target.classList.add('active');
            
            updateAppContent(targetId);
        }
    });
    
    patientSelect.addEventListener('change', (e) => {
        switchPatient(e.target.value);
    });
    
    newPatientBtn.addEventListener('click', createNewPatient);
    saveBtn.addEventListener('click', savePatients);

    // ===== Initialization =====
    loadPatients();
    updateHeaderColor();
    renderPatientSelector();
    
    // Initialize the first app by default
    const initialAppId = 'app1';
    document.getElementById(initialAppId).classList.add('active');
    document.querySelector(`.nav-button[data-target="${initialAppId}"]`).classList.add('active');
    updateAppContent(initialAppId);
});