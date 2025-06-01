const taskArea = document.getElementById('task-area');
const currentTaskElement = document.getElementById('current-task');
const completeButton = document.getElementById('complete-button');
const achievementArea = document.getElementById('achievement-area');
const completionMessageArea = document.getElementById('completion-message');
const areasVisualContainer = document.getElementById('areas-visual'); // エリアのコンテナを取得
const tasksListContainer = document.getElementById('tasks-list-container'); // タスクリストのコンテナを取得
const kanbanBoard = document.getElementById('kanban-board');
const newTaskTextInput = document.getElementById('new-task-text'); // 新しいタスク入力欄
const areaCheckboxesContainer = document.getElementById('area-checkboxes'); // エリアチェックボックスコンテナ
const addTaskButton = document.getElementById('add-task-button'); // タスク追加ボタン

// タスクをエリアごとに定義し、初期状態を追加 (初期データ構造を少し変更し、タスクはフラットに管理し、エリアとの関連を持たせる)
// 未分類タスクも同じ配列で管理し、areaIdをnullなどで持つ
let tasksData = []; // 全タスクをフラットな配列で管理

// エリア情報（タスクデータとは別に管理）
const areas = [
    { id: 'area-entrance', name: '玄関' },
    { id: 'area-hallway', name: '廊下' },
    { id: 'area-washroom', name: '洗面所' },
    { id: 'area-toilet', name: 'トイレ' },
    { id: 'area-bath', name: '風呂' },
    { id: 'area-living-kitchen', name: 'LDK (キッチン)' },
    { id: 'area-living-other', name: 'LDK (その他)' }
    // 必要に応じて他のエリアを追加
];

// 初期タスクデータを定義（初回ロード時のみ使用）
const initialTasks = [
     { id: 'entrance-task-1', text: "靴を揃える", areaId: 'area-entrance', state: 'todo' },
     { id: 'entrance-task-2', text: "たたきを掃く", areaId: 'area-entrance', state: 'todo' },
     { id: 'entrance-task-3', text: "傘立てを整える", areaId: 'area-entrance', state: 'todo' },
     { id: 'hallway-task-1', text: "床の物を片付ける", areaId: 'area-hallway', state: 'todo' },
     // ... 他のエリアの初期タスクもここに追加 ...
];

// LocalStorageからタスクの状態を読み込む
const savedTasksData = JSON.parse(localStorage.getItem('tasksData'));

if (savedTasksData && savedTasksData.length > 0) {
    tasksData = savedTasksData; // 保存されたデータがあれば使用
} else {
    // 保存されたデータがなければ初期タスクを使用
    // 初期タスクにユニークなIDがない場合はここで生成するなど考慮が必要
    tasksData = initialTasks; // シンプル化のためそのまま使用
}

// タスクデータをLocalStorageに保存する関数
function saveTasksData() {
    localStorage.setItem('tasksData', JSON.stringify(tasksData));
    updateAreaVisuals(); // 保存後にエリアの見た目も更新
    checkOverallCompletion(); // 保存後に全体完了もチェック
}

function renderKanbanBoard() {
    // 各列のタスクリスト要素を取得
    const uncategorizedList = document.getElementById('task-list-uncategorized');
    const todoList = document.getElementById('task-list-todo');
    const inProgressList = document.getElementById('task-list-in-progress');
    const doneList = document.getElementById('task-list-done');

    // リストをクリア
    uncategorizedList.innerHTML = '';
    todoList.innerHTML = '';
    inProgressList.innerHTML = '';
    doneList.innerHTML = '';

    // 着手・作業中・完了列のエリア別タスクリストを管理するためのマップ
    const todoAreaLists = {}; // 着手列用のマップを追加
    const inProgressAreaLists = {};
    const doneAreaLists = {};

    // タスクデータを元にカードを生成し、対応するリストに追加
    tasksData.forEach(task => {
        const taskCard = document.createElement('div');
        taskCard.classList.add('task-card');
        taskCard.setAttribute('draggable', true); // ドラッグ可能にする
        taskCard.dataset.taskId = task.id; // タスクIDをデータ属性として保持

        // タスクカードにエリア情報を表示
        const areaName = task.areaId ? areas.find(a => a.id === task.areaId)?.name : '未分類';
        taskCard.innerHTML = `<strong>${areaName}:</strong> ${task.text}`; // エリア名を太字で表示

        // 状態に応じたクラスを追加
        if (task.state === 'done') {
            taskCard.classList.add('task-done');
        }
         // 未分類タスクに区別がつくようなクラスを追加しても良い
         if (task.areaId === null) {
              taskCard.classList.add('task-uncategorized');
         }

        // ドラッグイベントリスナーを追加
        taskCard.addEventListener('dragstart', (event) => {
            event.dataTransfer.setData('text/plain', event.target.dataset.taskId); // ドラッグするデータのIDを設定
             // ドラッグ中の見た目を調整
            setTimeout(() => {
                taskCard.classList.add('dragging');
            }, 0);
        });

        taskCard.addEventListener('dragend', (event) => {
            event.target.classList.remove('dragging'); // ドラッグ終了時にクラスを削除
        });

        // 状態に基づいて対応するリストに追加
        if (task.state === 'uncategorized') {
             uncategorizedList.appendChild(taskCard);
        } else if (task.state === 'todo') {
            // エリアごとにグループ化
            if (task.areaId) { // エリアが紐づいているタスクのみグループ化
                 if (!todoAreaLists[task.areaId]) {
                     // 初めてそのエリアのタスクが現れた場合、エリア見出しとリストを作成
                     const areaNameForHeading = areas.find(a => a.id === task.areaId)?.name || '不明なエリア';
                     const areaHeading = document.createElement('h3');
                     areaHeading.textContent = areaNameForHeading;
                     areaHeading.classList.add('area-group-heading'); // スタイリング用のクラス

                     const areaTaskList = document.createElement('div');
                     areaTaskList.classList.add('area-task-list'); // スタイリング用のクラス
                     areaTaskList.dataset.areaId = task.areaId; // エリアIDを保持

                     todoList.appendChild(areaHeading);
                     todoList.appendChild(areaTaskList);

                     todoAreaLists[task.areaId] = areaTaskList;
                 }
                 todoAreaLists[task.areaId].appendChild(taskCard); // エリア別リストに追加
            } else {
                 // エリアが紐づいていないタスクはそのまま追加
                 todoList.appendChild(taskCard);
            }
        } else if (task.state === 'in-progress') {
            // エリアごとにグループ化
            if (task.areaId) { // エリアが紐づいているタスクのみグループ化
                 if (!inProgressAreaLists[task.areaId]) {
                     // 初めてそのエリアのタスクが現れた場合、エリア見出しとリストを作成
                     const areaNameForHeading = areas.find(a => a.id === task.areaId)?.name || '不明なエリア';
                     const areaHeading = document.createElement('h3');
                     areaHeading.textContent = areaNameForHeading;
                     areaHeading.classList.add('area-group-heading'); // スタイリング用のクラス

                     const areaTaskList = document.createElement('div');
                     areaTaskList.classList.add('area-task-list'); // スタイリング用のクラス
                     areaTaskList.dataset.areaId = task.areaId; // エリアIDを保持

                     inProgressList.appendChild(areaHeading);
                     inProgressList.appendChild(areaTaskList);

                     inProgressAreaLists[task.areaId] = areaTaskList;
                 }
                 inProgressAreaLists[task.areaId].appendChild(taskCard); // エリア別リストに追加
            } else {
                 // エリアが紐づいていないタスクはそのまま追加（未着手から移動してきた場合など）
                 inProgressList.appendChild(taskCard);
            }

        } else if (task.state === 'done') {
            // エリアごとにグループ化
             if (task.areaId) { // エリアが紐づいているタスクのみグループ化
                 if (!doneAreaLists[task.areaId]) {
                     // 初めてそのエリアのタスクが現れた場合、エリア見出しとリストを作成
                     const areaNameForHeading = areas.find(a => a.id === task.areaId)?.name || '不明なエリア';
                     const areaHeading = document.createElement('h3');
                     areaHeading.textContent = areaNameForHeading;
                     areaHeading.classList.add('area-group-heading'); // スタイリング用のクラス

                     const areaTaskList = document.createElement('div');
                     areaTaskList.classList.add('area-task-list'); // スタイリング用のクラス
                     areaTaskList.dataset.areaId = task.areaId; // エリアIDを保持

                     doneList.appendChild(areaHeading);
                     doneList.appendChild(areaTaskList);

                     doneAreaLists[task.areaId] = areaTaskList;
                 }
                 doneAreaLists[task.areaId].appendChild(taskCard); // エリア別リストに追加
            } else {
                 // エリアが紐づいていないタスクはそのまま追加
                 doneList.appendChild(taskCard);
            }
        }
    });

    updateAreaVisuals(); // 表示更新後にエリアの見た目も更新
    checkOverallCompletion(); // 表示更新後に全体完了もチェック
}

// ドロップエリア（各列のtask-list および エリア別task-list）へのイベントリスナーを追加
document.querySelectorAll('.task-list, .area-task-list').forEach(list => {
    list.addEventListener('dragover', (event) => {
        event.preventDefault(); // デフォルトのドラッグオーバー動作を無効化（ドロップを許可するため）
        // ドロップインジケーターなどを表示しても良い
    });

     list.addEventListener('dragleave', (event) => {
         // ドロップインジケーターなどを非表示にする
     });

    list.addEventListener('drop', (event) => {
        event.preventDefault();
        const taskId = event.dataTransfer.getData('text/plain'); // ドラッグされたタスクIDを取得
        const draggedElement = document.querySelector(`[data-task-id=\"${taskId}\"]`); // ドラッグされた要素を取得
        // ドロップ先のタスクリストまたはエリア別タスクリストを取得
        const targetList = event.target.closest('.task-list') || event.target.closest('.area-task-list');

        if (draggedElement && targetList) {
             // ドロップ先の要素がタスクカード自体だった場合は、タスクリストを親として取得
             const dropTarget = event.target.classList.contains('task-card') ? event.target.parentElement : event.target;

             // 正しいドロップ位置を見つける (タスクカード間、またはリストの末尾)
             const afterElement = getDragAfterElement(targetList, event.clientY);
             if (afterElement == null) {
                 targetList.appendChild(draggedElement);
             } else {
                 targetList.insertBefore(draggedElement, afterElement);
             }

            // タスクの状態を更新
            // ドロップ先のリストの親（看板列）のIDから状態を抽出
            const parentColumnId = targetList.closest('.kanban-column').id;
            const newState = parentColumnId.replace('column-', ''); // column-uncategorized -> uncategorized
            updateTaskState(taskId, newState);

            // 必要に応じて、状態変化時の視覚的なフィードバックや効果音を追加
             if (newState === 'done') {
                 draggedElement.classList.add('task-done');
                  console.log(`タスク「${draggedElement.textContent}」を完了に移動！`);
                  showAchievementMessageTemporarily(); // 完了時に達成メッセージ
             } else {
                  draggedElement.classList.remove('task-done'); // 完了から戻った場合はスタイルを削除
                  console.log(`タスク「${draggedElement.textContent}」を${newState}に移動`);
             }

            saveTasksData(); // 状態変更をLocalStorageに保存
            renderKanbanBoard(); // 看板を再レンダリングしてエリアグループを更新
        }
    });
});

// ドラッグ中にどこに挿入するかを決定するヘルパー関数
// エリア別リスト内のドロップ位置も考慮するように修正が必要
function getDragAfterElement(container, y) {
    // ドロップ対象がエリア別タスクリストの場合も考慮
    const draggableElements = [...container.querySelectorAll('.task-card:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function updateTaskState(taskId, newState) {
    // tasksData内の該当タスクの状態を更新
    const task = tasksData.find(t => t.id === taskId);
    if (task) {
        task.state = newState;
        // 状態が'in-progress'または'done'になった場合、areaIdがnullなら未着手のままにするかどうかも検討が必要
        // 現在のロジックではareaIdはタスク追加時のみ設定され、状態変更では変わらない
    }
}

function updateAreaVisuals() {
    // エリアの完了状態（そのエリアに紐づく全てのタスクが'done'か）を視覚的に更新
    // 未分類タスクはエリア完了に影響しない
    areas.forEach(area => {
        const areaElement = document.getElementById(area.id);
        if (areaElement) {
            // そのエリアに紐づくタスクのみをフィルタリング
            const areaTasks = tasksData.filter(task => task.areaId === area.id);

            // エリアにタスクが一つもない場合は完了としない
            if (areaTasks.length === 0) {
                 areaElement.classList.remove('completed'); // タスクがなければ完了ではないと判断
                 return; // 次のエリアへ
            }

            // そのエリアのタスクが全て'done'状態かチェック
            const allTasksInAreaDone = areaTasks.every(task => task.state === 'done');

            if (allTasksInAreaDone) {
                areaElement.classList.add('completed');
            } else {
                areaElement.classList.remove('completed');
            }
        }
    });
}

function showAchievementMessageTemporarily() {
     achievementArea.style.display = 'block';
     setTimeout(() => {
         achievementArea.style.display = 'none';
     }, 1000); // 1秒表示
}

function checkOverallCompletion() {
     // エリアが紐づいているタスクが全て'done'かチェック
     // 未分類タスクは全体の完了に影響しないと仮定
     const nonUncategorizedTasks = tasksData.filter(task => task.areaId !== null);

     // エリア付きタスクが一つもない場合は完了としない
     if (nonUncategorizedTasks.length === 0) {
         completionMessageArea.style.display = 'none';
         return;
     }

     const allAreaTasksCompleted = nonUncategorizedTasks.every(task => task.state === 'done');

     if (allAreaTasksCompleted) {
         completionMessageArea.style.display = 'block';
         // 全体完了時の特別な演出を追加
     } else {
          completionMessageArea.style.display = 'none';
     }
}

// エリア選択ラジオボタンを生成
function renderAreaCheckboxes() { // 関数名はチェックボックスのままですが、ラジオボタンを生成します
    areaCheckboxesContainer.innerHTML = ''; // クリア
    // 「未分類」の選択肢を追加
     const uncategorizedRadioHTML = `\n         <input type=\"radio\" id=\"area-uncategorized\" name=\"taskArea\" value=\"null\" checked>\n         <label for=\"area-uncategorized\">未分類</label>\n     `;
     areaCheckboxesContainer.innerHTML += uncategorizedRadioHTML;

    areas.forEach(area => {
        const radioHTML = `\n            <input type=\"radio\" id=\"area-${area.id}\" name=\"taskArea\" value=\"${area.id}\">\n            <label for=\"area-${area.id}\">${area.name}</label>\n        `;
        areaCheckboxesContainer.innerHTML += radioHTML;
    });
     // デフォルトで未分類を選択状態にする
    const defaultUncategorizedRadio = areaCheckboxesContainer.querySelector('input[value="null"]');
     if (defaultUncategorizedRadio) {
         defaultUncategorizedRadio.checked = true;
     }
}

// タスク追加ボタンのイベントリスナー
addTaskButton.addEventListener('click', () => {
    const taskText = newTaskTextInput.value.trim();
    if (taskText === '') {
        alert('タスク内容を入力してください。');
        return;
    }

    // 選択されたエリアを取得 (ラジオボタンなので一つ)
    const selectedRadio = areaCheckboxesContainer.querySelector('input[name="taskArea"]:checked');
    // ラジオボタンの値が'null'の場合は実際のareaIdをnullにする
    const newTaskAreaId = selectedRadio ? (selectedRadio.value === 'null' ? null : selectedRadio.value) : null; // 選択されていなければnull

    // 新しいタスクはデフォルトで「未着手」(uncategorized) 列に追加
    const newTaskState = 'uncategorized';

    const newTaskId = `task-${Date.now()}`; // 簡単なユニークID生成

    const newTask = {
        id: newTaskId,
        text: taskText,
        areaId: newTaskAreaId, // 紐づくエリアID (nullの場合は未分類)
        state: newTaskState
    };

    // タスクデータを追加
    tasksData.push(newTask);

    // LocalStorageに保存
    saveTasksData();

    // 看板を再レンダリングして新しいタスクを表示
    renderKanbanBoard();

    // フォームをクリア
    newTaskTextInput.value = '';
    // 未分類ラジオボタンを選択状態に戻す
    const defaultUncategorizedRadio = areaCheckboxesContainer.querySelector('input[value="null"]');
     if (defaultUncategorizedRadio) {
         defaultUncategorizedRadio.checked = true;
     }
});

// アプリ開始時の初期処理
renderAreaCheckboxes(); // エリア選択ラジオボタンを生成
renderKanbanBoard(); // 看板ボードをレンダリング 