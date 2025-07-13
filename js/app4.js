window.integrationApp = (function() {
    // DOM要素
    let outputMemo, copyButton;

    // 初期化
    function initialize() {
        outputMemo = document.getElementById('output-memo-app4');
        copyButton = document.getElementById('copy-button-app4');
        
        copyButton.addEventListener('click', copyToClipboard);
    }

    // データ読み込み (表示更新)
    function loadData(allPatientData) {
        // app1のデータからカルテテキストを生成
        const app1Data = allPatientData.app1 || {};
        let smokingText = app1Data.smokingStatus || '未選択';
        if (app1Data.smokingDetails) {
            smokingText += ` (${app1Data.smokingDetails.amount || '?'}本/日 x ${app1Data.smokingDetails.years || '?'}年)`;
        }
        let drinkingText = app1Data.drinkingStatus || '未選択';
        if (app1Data.drinkingDetails) {
            drinkingText += ` (${app1Data.drinkingDetails.type || '?'}を${app1Data.drinkingDetails.amount || '?'})`;
        }
        const app1Output = `
【患者情報】
氏名：${app1Data.name || '未入力'} 様
年齢：${app1Data.age || '未入力'} 歳
性別：${app1Data.gender || '未選択'}

【既往歴】
・${(app1Data.histories && app1Data.histories.length > 0) ? app1Data.histories.join('、') : '特記事項なし'}
${app1Data.surgery ? '・手術歴/特記事項：' + app1Data.surgery : ''}

【内服薬】
${(app1Data.medications && app1Data.medications.length > 0) ? app1Data.medications.map(m => `・${m}`).join('\n') : '・なし'}

【アレルギー】
・${app1Data.allergies || '特になし'}
${app1Data.otherAllergies ? '・その他：' + app1Data.otherAllergies : ''}

【生活歴】
喫煙：${smokingText}
飲酒：${drinkingText}

【ADL】
Barthel Index: ${app1Data.adlScore || 0}点
        `.trim();


        // app2のデータから症候テキストを生成
        const app2Data = allPatientData.app2 || {};
        let app2Output = '';
        if (app2Data.selectionOrder && app2Data.selectionOrder.length > 0) {
            app2Output += '■ 症候\n';
            app2Output += `主訴: ${app2Data.selectionOrder[0]}\n`;
            if (app2Data.selectionOrder.length > 1) {
                app2Output += `その他: ${app2Data.selectionOrder.slice(1).join(', ')}\n`;
            }
            app2Output += '\n';
        }
        if (app2Data.recordedDiagnoses && app2Data.recordedDiagnoses.length > 0) {
            let hasRecorded = false;
            let diagnosisText = '■ 鑑別疾患\n';
            const recordedMap = new Map(app2Data.recordedDiagnoses);
            recordedMap.forEach((diseases, symptom) => {
                if (diseases.length > 0) {
                    hasRecorded = true;
                    diagnosisText += `# ${symptom}\n`;
                    diseases.forEach(disease => {
                        diagnosisText += `- ${disease}\n`;
                    });
                }
            });
            if(hasRecorded) app2Output += diagnosisText + '\n';
        }
        if (app2Data.selectedKeywords && app2Data.selectedKeywords.length > 0) {
            app2Output += '■ 選択キーワード (身体所見など)\n';
            app2Data.selectedKeywords.forEach(keyword => {
                app2Output += `- ${keyword}\n`;
            });
            app2Output += '\n';
        }
        app2Output = app2Output.trim() || '症候鑑別支援データがありません。';


        // app3のデータから採血結果テキストを生成
        const app3Data = allPatientData.app3 || {};
        let app3Output = '採血結果データがありません。';
        if (app3Data.records && app3Data.records.length > 0) {
            app3Output = "■ 保存済み採血データ一覧\n";
            const sortedRecords = [...app3Data.records].sort((a, b) => new Date(b.testDate) - new Date(a.testDate));
            sortedRecords.forEach(data => {
                app3Output += `----------------------------------------\n`;
                app3Output += `検査日: ${data.testDate || '未入力'}\n`;
                
                const resultsText = Object.entries(data.results)
                    .map(([key, value]) => ` - ${key}: ${value}`)
                    .join('\n');
                
                if (resultsText) {
                    app3Output += resultsText + '\n';
                }
                
                if (data.memo) {
                    app3Output += `メモ: ${data.memo}\n`;
                }
            });
        }
        
        // 全てのデータを結合
        const finalOutput = `
##
#
#   カルテ記載支援 (App1)
#
##

${app1Output}

========================================

##
#
#   症候鑑別支援 (App2)
#
##

${app2Output}

========================================

##
#
#   採血結果入力 (App3)
#
##

${app3Output}
        `.trim();

        outputMemo.value = finalOutput;
    }

    function copyToClipboard() {
        navigator.clipboard.writeText(outputMemo.value).then(() => {
            const originalText = copyButton.textContent;
            copyButton.textContent = 'コピーしました！';
            setTimeout(() => {
                copyButton.textContent = originalText;
            }, 1500);
        }).catch(err => {
            console.error('クリップボードへのコピーに失敗しました: ', err);
            alert('コピーに失敗しました。');
        });
    }
    
    // このアプリは表示専用なのでgetDataは不要
    return {
        initialize,
        loadData
    };
})();