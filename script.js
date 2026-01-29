document.addEventListener("DOMContentLoaded", () => {
  /* ===========================
     CONFIG
  ============================ */
  const MASTER_PASSWORD = "Deepak123";
  const STORAGE_KEY = "data";

  /* ===========================
     SAFE LOCALSTORAGE LOAD
  ============================ */
  let data = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      data = JSON.parse(raw);
      if (typeof data !== "object" || Array.isArray(data)) throw new Error();
    }
  } catch {
    console.warn("⚠️ Corrupted localStorage cleared");
    localStorage.removeItem(STORAGE_KEY);
    data = {};
  }

  const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

  /* ===========================
     DOM ELEMENTS
  ============================ */
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
  const exportPdfBtn = document.getElementById("exportPdf");

  // Password modal
  const modal = document.getElementById("passwordModal");
  const passwordInput = document.getElementById("passwordInput");
  const modalText = document.getElementById("modalText");
  const errorMsg = document.getElementById("errorMsg");
  let pendingAction = null;

  /* ===========================
     MODAL FUNCTIONS
  ============================ */
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

  /* ===========================
     CUSTOMER FUNCTIONS
  ============================ */
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

  /* ===========================
     TRANSACTION FUNCTIONS
  ============================ */
  document.getElementById("addTxn").onclick = () => {
    const c = customers.value;
    if (!c) return alert("Select customer");

    const txn = {
      id: Date.now().toString(),
      date: dateEl.value || new Date().toISOString().slice(0, 10),
      amount: Number(amount.value),
      type: type.value,
      note: note.value || ""
    };

    data[c].push(txn);
    save();
    amount.value = note.value = "";
    dateEl.value = "";
    render();
  };

  /* ===========================
     RENDER FUNCTION
  ============================ */
  function render() {
    const c = customers.value;
    list.innerHTML = "";
    if (!c || !Array.isArray(data[c])) return;

    const filter = searchEl.value.toLowerCase();
    let balance = 0, totalCredit = 0, totalDebit = 0;

    const sortedTxns = [...data[c]].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    sortedTxns.forEach(txn => {
      if (!txn.note.toLowerCase().includes(filter)) return;

      balance += txn.type === "credit" ? txn.amount : -txn.amount;
      txn.type === "credit" ? totalCredit += txn.amount : totalDebit += txn.amount;

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
    summaryEl.textContent = `Credit: ${totalCredit} | Debit: ${totalDebit}`;
  }

  /* ===========================
     SEARCH & SELECT EVENTS
  ============================ */
  customers.onchange = render;
  searchEl.oninput = render;

  /* ===========================
     EXPORT PDF
  ============================ */
  exportPdfBtn.onclick = () => {
    const c = customers.value;
    if (!c) return alert("Select a customer");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.setTextColor(37, 99, 235);
    doc.text(`Transactions Statement for ${c}`, 14, 20);

    const filter = searchEl.value.toLowerCase();
    const txns = [...data[c]]
      .filter(t => t.note.toLowerCase().includes(filter))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (txns.length === 0) {
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text("No transactions to export.", 14, 40);
      doc.save(`${c}_transactions.pdf`);
      return;
    }

    let totalCredit = 0, totalDebit = 0;
    const tableBody = txns.map(t => {
      t.type === "credit" ? totalCredit += t.amount : totalDebit += t.amount;
      return [t.date, t.type, t.amount.toFixed(2), t.note];
    });

    doc.autoTable({
      startY: 30,
      head: [['Date', 'Type', 'Amount', 'Note']],
      body: tableBody,
      styles: { halign: 'center' },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 245, 255] },
      columnStyles: {
        1: {
          cellWidth: 25,
          fillColor: function(row) {
            return row.raw[1] === "credit" ? [220, 255, 220] : [255, 220, 220];
          },
          textColor: function(row) {
            return row.raw[1] === "credit" ? [22, 163, 74] : [220, 38, 38];
          }
        },
        2: { halign: 'right' }
      },
      margin: { top: 10 },
    });

    const finalY = doc.lastAutoTable.finalY + 10 || 40;
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 128);
    doc.text(`Total Credit: ${totalCredit.toFixed(2)} | Total Debit: ${totalDebit.toFixed(2)} | Balance: ${(totalCredit - totalDebit).toFixed(2)}`, 14, finalY);

    doc.save(`${c}_transactions.pdf`);
  };

  /* ===========================
     INITIAL LOAD
  ============================ */
  Object.keys(data).forEach(c => customers.add(new Option(c, c)));
  render();
});


