const API = "http://localhost:3000/api";

// LOAD VIOLATIONS
window.onload = function () {
    fetch(API + "/violations")
    .then(res => res.json())
    .then(data => {
        let select = document.getElementById("violation");
        if (!select) return;

        data.forEach(v => {
            select.innerHTML += `
            <option value="${v.violation_id}">
                ${v.violation_type} - ${v.fine}
            </option>`;
        });
    })
    .catch(err => console.log("Error:", err));
};

// CREATE CHALLAN
function createChallan() {
    const vehicle = document.getElementById("vehicle").value;
    const violation = document.getElementById("violation").value;

    console.log("Sending:", vehicle, violation);

    fetch(API + "/createChallan", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            vehicle_number: vehicle,
            violation_id: violation
        })
    })
    .then(res => res.text())
    .then(msg => {
        console.log("Response:", msg);
        alert(msg);
    })
    .catch(err => console.log("Fetch error:", err));
}

// GET CHALLAN
function getChallan() {
    const vehicle = document.getElementById("vehicle").value;

    fetch(API + "/challan/" + vehicle)
    .then(res => res.json())
    .then(data => {

        let table = document.getElementById("table");
        let msg = document.getElementById("message");

        table.innerHTML = "";
        msg.innerHTML = "";

        if (data.message) {
            msg.innerHTML = data.message;
            return;
        }

        table.innerHTML = `
        <tr>
        <th>ID</th>
        <th>Violation</th>
        <th>Fine</th>
        <th>Status</th>
        <th>Action</th>
        </tr>`;

        data.forEach(row => {
            table.innerHTML += `
            <tr>
                <td>${row.challan_id}</td>
                <td>${row.violation_type}</td>
                <td>₹${row.fine}</td>
                <td class="${row.payment_status === 'Paid' ? 'paid' : 'pending'}">
                    ${row.payment_status}
                </td>
                <td>
                    ${row.payment_status === "Pending"
                    ? `<button onclick="pay(${row.challan_id})">Pay</button>`
                    : "✔"}
                </td>
            </tr>`;
        });
    });
}

// PAY
function pay(id) {
    fetch(API + "/pay/" + id, { method: "PUT" })
    .then(() => getChallan());
}