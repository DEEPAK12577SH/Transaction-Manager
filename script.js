document.addEventListener("DOMContentLoaded", () => {

  const MASTER_PASSWORD = "1234";
  let data = JSON.parse(localStorage.getItem("data") || "{}");

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

  const save = () => localStorage.setItem("data", JSON.stringify(data));

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

  document.getElementById("addCustomer").onclick = () => {
    const name = customerName.value.trim();
    if (!name || data[name]) return alert("Invalid customer");
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
      customers.querySelector(`option[value="${c}"]`).remove();
      customers.value = "";
      render();
    });
  };

  document.getElementById("addTxn").onclick = () => {
    const c = customers.value;
    if (!c) return alert("Select customer");

    data[c].push({
      id: Date.now(),
      date: dateEl.value || new Date().toISOString().split("T")[0],
      amount: Number(amount.value),
      type: type.value,
      note: note.value
    });

    save();
    amount.value = note.value = "";
    render();
  };

  function render() {
    const c = customers.value;
    list.innerHTML = "";
    if (!c) return;

    let balance = 0, credit = 0, debit = 0;
    const filter = searchEl.value.toLowerCase();

    // SORT BY DATE (latest first)
    const txns = [...data[c]].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    txns.forEach(txn => {
      if (!txn.note.toLowerCase().includes(filter)) return;

      balance += txn.type === "credit" ? txn.amount : -txn.amount;
      txn.type === "credit" ? credit += txn.amount : debit += txn.amount;

      const li = document.createElement("li");
      li.innerHTML = `
        <span class="${txn.type}">
          ${txn.date} | ${txn.type}: ${txn.amount} (${txn.note})
        </span>
        <button>❌</button>
      `;

      li.querySelector("button").onclick = () => {
        openModal("Delete this transaction?", () => {
          data[c] = data[c].filter(t => t.id !== txn.id);
          save();
          render();
        });
      };

      list.appendChild(li);
    });

    balanceEl.textContent = "Balance: " + balance;
    summaryEl.textContent = `Credit: ${credit} | Debit: ${debit}`;
  }

  // EXPORT PDF
  document.getElementById("exportPdf").onclick = () => {
    const c = customers.value;
    if (!c) return alert("Select customer");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text(`Transactions - ${c}`, 14, 15);

    let credit = 0, debit = 0;

    const rows = data[c]
      .sort((a,b)=> new Date(a.date) - new Date(b.date))
      .map(t => {
        t.type === "credit" ? credit += t.amount : debit += t.amount;
        return [t.date, t.type, t.amount, t.note];
      });

    doc.autoTable({
      startY: 25,
      head: [["Date", "Type", "Amount", "Note"]],
      body: rows,
      headStyles: { fillColor: [37, 99, 235] },
      alternateRowStyles: { fillColor: [235, 240, 255] }
    });

    doc.text(
      `Total Credit: ${credit} | Total Debit: ${debit} | Balance: ${credit - debit}`,
      14,
      doc.lastAutoTable.finalY + 10
    );

    doc.save(`${c}_transactions.pdf`);
  };

  Object.keys(data).forEach(c => customers.add(new Option(c, c)));
  customers.onchange = render;
  searchEl.oninput = render;
});
