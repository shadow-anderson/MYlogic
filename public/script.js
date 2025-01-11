document.getElementById('treatment-dropdown').addEventListener('change', function () {
    const selectedTable = this.value;
    fetch(`/get-clinics?table=${selectedTable}`)
        .then(response => response.json())
        .then(data => {
            const tableBody = document.getElementById('table-body');
            tableBody.innerHTML = '';

            data.forEach(clinic => {
                const row = document.createElement('tr');
                row.innerHTML = `<td>${clinic.Name}</td>`;
                tableBody.appendChild(row);
            });
        })
        .catch(error => console.error('Error:', error));
});
