let data = JSON.parse(localStorage.getItem("data")) || {};

function save() {
  localStorage.setItem("data", JSON.stringify(data));
}

function addCustomer() {
  let name = customerName.value.trim();
  if (!name) return alert("Enter name");
  if (data[name]) return alert("Customer exists");

  data[name] = [];
  save();
  customerName.value = "";
  updateCustomers();
}

function updateCustomers() {
  customerSelect.innerHTML = "";
  Object.keys(data).forEach(c => {
    let o = document.createElement("option");
    o.value = c;
    o.textContent = c;
    customerSelect.appendChild(o);
  });
  loadTransactions();
}

function deleteCustomer() {
  let c = customerSelect.value;
  if (!c) return;
  if (confirm("Delete customer?")) {
    delete data[c];
    save();
    updateCustomers();
  }
}

function addTransaction() {
  let c = customerSelect.value;
  if (!c) return alert("Select customer");

  let t = {
    date: date.value,
    amount: Number(amount.value),
    type: type.value,
    note: note.value
  };

  data[c].push(t);
  save();
  amount.value = note.value = "";
  loadTransactions();
}

function loadTransactions() {
  let c = customerSelect.value;
  transactionList.innerHTML = "";
  if (!c) return;

  let searchText = search.value.toLowerCase();
  let balance = 0;

  data[c].forEach((t, i) => {
    if (!t.note.toLowerCase().includes(searchText)) return;

    balance += t.type === "credit" ? t.amount : -t.amount;

    let li = document.createElement("li");
    li.innerHTML = `
      <span class="${t.type}">
        ${t.date} | ${t.type.toUpperCase()} | ${t.amount} | ${t.note}
      </span>
      <span class="actions">
        <button onclick="deleteTransaction(${i})">❌</button>
      </span>
    `;
    transactionList.appendChild(li);
  });

  balanceEl = document.getElementById("balance");
  balanceEl.textContent = "Balance: " + balance;
}

function deleteTransaction(i) {
  let c = customerSelect.value;
  data[c].splice(i, 1);
  save();
  loadTransactions();
}

function exportCSV() {
  let c = customerSelect.value;
  if (!c) return;

  let csv = "Date,Type,Amount,Note\n";
  data[c].forEach(t => {
    csv += `${t.date},${t.type},${t.amount},${t.note}\n`;
  });

  let blob = new Blob([csv], { type: "text/csv" });
  let a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = c + "_transactions.csv";
  a.click();
}

updateCustomers();
