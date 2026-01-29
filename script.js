document.addEventListener("DOMContentLoaded", () => {

  /* ======================
     CONFIG
  ====================== */
  const MASTER_PASSWORD = "1234";
  const STORAGE_KEY = "data";

  /* ======================
     SAFE STORAGE LOAD
  ====================== */
  let data = {};

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      data = JSON.parse(raw);
      if (typeof data !== "object" || Array.isArray(data)) {
        throw new Error("Invalid structure");
      }
    }
  } catch (e) {
    console.warn("⚠️ Corrupted localStorage cleared");
    localStorage.removeItem(STORAGE_KEY);
    data = {};
  }

  const save = () =>
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

  /* ======================
     DOM
  ====================== */
  const customerName = document.getElementById("customerName");
  const customers = document.getElementById("customers");
  const dateEl = document.getElementById("date");
  const amount = document.getElementById("amount");
  const type = document.getElementById("type");
  const note = document.getElementById("note");
  const list = document.getElementById("list");
  const balanceEl = document.getElementById("balance");
  const summaryEl = document.getElementById("summary");
  const searchEl = document.getElementById("search");

  const modal = document.getElementById("passwordModal");
  const passwordInput = document.getElementById("passwordInput");
  const modalText = document.getElementById("modalText");
  const errorMsg = document.getElementById("errorMsg");

  let pendingAction = null;

  /* ======================
     MODAL
  ====================== */
  function openModal(text, action) {
    modalText.textContent = text;
    passwordInput.value = "";
    errorMsg.textContent = "";
    modal.classList.remove("hidden");
    pendingAction = action;
  }

  function closeModal() {
    modal.classList.add("hidden");
    pendingAction = null;
  }

  document.getElementById("confirmBtn").onclick = () => {
    if (passwordInput.value !== MASTER_PASSWORD) {
      errorMsg.textContent = "❌ Incorrect password";
      return;
    }
    pendingAction && pendingAction();
    closeModal();
  };

  document.getElementById("cancelBtn").onclick = closeModal;

  /* ======================
     CUSTOMER
  ====================== */
  document.getElementById("addCustomer").onclick = () => {
    const name = customerName.value.trim();
    if (!name || data[name]) return alert("Invalid or duplicate customer");
    data[name] = [];
    save();
    customers.add(new Option(name, name));
    customers.value = name;
    customerName.value = "";
    render();
  };

  document.getElementById("deleteCustomer").onclick = () => {
    const c = customers.value;
    if (!c) return;
    openModal(`Delete customer "${c}" permanently?`, () => {
      delete data[c];
      save();
      customers.querySelector(`option[value="${c}"]`)?.remove();
      customers.value = "";
      render();
    });
  };

  /* ======================
     TRANSACTIONS
  ====================== */
  document.getElementById("addTxn").onclick = () => {
    const c = customers.value;
    if (!c) return alert("Select customer");

    data[c].push({
      id: Date.now().toString(),
      date: dateEl.value || new Date().toISOString().slice(0, 10),
      amount: Number(amount.value),
      type: type.value,
      note: note.value || ""
    });

    save();
    amount.value = note.value = "";
    render();
  };

  /* ======================
     RENDER
  ====================== */
  function render() {
    const c = customers.value;
    list.innerHTML = "";
    if (!c || !Array.isArray(data[c])) return;

    let balance = 0, credit = 0, debit = 0;
    const filter = searchEl.value.toLowerCase();

    const sorted = [...data[c]].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    sorted.forEach(txn => {
      if (!txn.note.toLowerCase().includes(filter)) return;

      balance += txn.type === "credit" ? txn.amount : -txn.amount;
      txn.type === "credit" ? credit += txn.amount : debit += txn.amount;

      const li = document.createElement("li");

      const span = document.createElement("span");
      span.className = txn.type;
      span.textContent = `${txn.date} | ${txn.type}: ${txn.amount} (${txn.note})`;

      const btn = document.createElement("button");
      btn.textContent = "❌";
      btn.onclick = () => {
        openModal("Delete this transaction?", () => {
          data[c] = data[c].filter(t => t.id !== txn.id);
          save();
          render();
        });
      };

      li.appendChild(span);
      li.appendChild(btn);
      list.appendChild(li);
    });

    balanceEl.textContent = "Balance: " + balance;
    summaryEl.textContent = `Credit: ${credit} | Debit: ${debit}`;
  }

  /* ======================
     INIT
  ====================== */
  Object.keys(data).forEach(c => customers.add(new Option(c, c)));
  customers.onchange = render;
  searchEl.oninput = render;
});
