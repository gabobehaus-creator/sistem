class MinibarDashboard extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        this.products = [];
        this.editingProduct = null;

        this.shadow.innerHTML = `
            <style>
                .minibar-container {
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .form-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr auto;
                    gap: 10px;
                    margin-bottom: 20px;
                    align-items: end;
                }
                input, button {
                    padding: 10px;
                    border-radius: 4px;
                    border: 1px solid #ddd;
                }
                button {
                    background-color: #007bff;
                    color: white;
                    cursor: pointer;
                    border: none;
                }
                button.cancel {
                    background-color: #6c757d;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 15px;
                }
                th, td {
                    border: 1px solid #eee;
                    padding: 12px;
                    text-align: left;
                }
                th {
                    background-color: #f8f9fa;
                }
                .actions button {
                    margin-right: 5px;
                    padding: 8px 12px;
                    font-size: 0.9em;
                }
                .actions .edit { background-color: #28a745; }
                .actions .delete { background-color: #dc3545; }
                .message {
                    padding: 10px;
                    margin-bottom: 15px;
                    border-radius: 4px;
                    display: none;
                }
                .message.success { background-color: #d4edda; color: #155724; }
                .message.error { background-color: #f8d7da; color: #721c24; }
            </style>
            <div class="minibar-container">
                <div class="message" id="messageArea"></div>
                <h2>Productos del Minibar</h2>
                <form id="productForm" class="form-grid">
                    <div class="form-group">
                        <label for="productName">Nombre</label>
                        <input type="text" id="productName" placeholder="Ej: Coca Cola" required>
                    </div>
                    <div class="form-group">
                        <label for="productPrice">Precio</label>
                        <input type="number" id="productPrice" step="0.01" min="0" required>
                    </div>
                    <div class="form-group">
                        <label for="productQuantity">Cantidad</label>
                        <input type="number" id="productQuantity" min="0" required>
                    </div>
                    <div>
                        <button type="submit" id="saveProductButton">Añadir Producto</button>
                        <button type="button" class="cancel" id="cancelEditButton" style="display:none;">Cancelar</button>
                    </div>
                </form>

                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre</th>
                            <th>Precio</th>
                            <th>Cantidad</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="minibarProductTableBody">
                        <!-- Productos se cargarán aquí -->
                    </tbody>
                </table>
            </div>
        `;
    }

    connectedCallback() {
        this.fetchProducts();
        this.shadow.getElementById('productForm').addEventListener('submit', (e) => this.handleSubmit(e));
        this.shadow.getElementById('cancelEditButton').addEventListener('click', () => this.cancelEdit());
    }

    async fetchProducts() {
        try {
            const response = await fetch('/api/minibar/products');
            if (response.ok) {
                const data = await response.json();
                this.products = data.data;
                this.renderTable();
            } else {
                this.showMessage('Error al cargar productos.', 'error');
            }
        } catch (error) {
            console.error('Error fetching minibar products:', error);
            this.showMessage('Error de conexión al cargar productos.', 'error');
        }
    }

    renderTable() {
        const tbody = this.shadow.getElementById('minibarProductTableBody');
        tbody.innerHTML = '';
        this.products.forEach(product => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${product.id}</td>
                <td>${product.name}</td>
                <td>$${product.price.toFixed(2)}</td>
                <td>${product.quantity}</td>
                <td class="actions">
                    <button class="edit" data-id="${product.id}">Editar</button>
                    <button class="delete" data-id="${product.id}">Eliminar</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        this.shadow.querySelectorAll('.actions .edit').forEach(button => {
            button.addEventListener('click', (e) => this.editProduct(e.target.dataset.id));
        });
        this.shadow.querySelectorAll('.actions .delete').forEach(button => {
            button.addEventListener('click', (e) => this.deleteProduct(e.target.dataset.id));
        });
    }

    async handleSubmit(event) {
        event.preventDefault();
        const name = this.shadow.getElementById('productName').value;
        const price = parseFloat(this.shadow.getElementById('productPrice').value);
        const quantity = parseInt(this.shadow.getElementById('productQuantity').value);

        if (!name || isNaN(price) || price < 0 || isNaN(quantity) || quantity < 0) {
            this.showMessage('Por favor, complete todos los campos con valores válidos.', 'error');
            return;
        }

        const method = this.editingProduct ? 'PUT' : 'POST';
        const url = this.editingProduct ? `/api/minibar/products/${this.editingProduct.id}` : '/api/minibar/products';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, price, quantity })
            });

            if (response.ok) {
                this.showMessage(`Producto ${this.editingProduct ? 'actualizado' : 'añadido'} exitosamente.`, 'success');
                this.resetForm();
                this.fetchProducts();
            } else {
                const errorData = await response.json();
                this.showMessage(`Error: ${errorData.error}`, 'error');
            }
        } catch (error) {
            console.error('Error saving minibar product:', error);
            this.showMessage('Error de conexión al guardar producto.', 'error');
        }
    }

    editProduct(id) {
        const product = this.products.find(p => p.id == id);
        if (product) {
            this.editingProduct = product;
            this.shadow.getElementById('productName').value = product.name;
            this.shadow.getElementById('productPrice').value = product.price;
            this.shadow.getElementById('productQuantity').value = product.quantity;
            this.shadow.getElementById('saveProductButton').textContent = 'Actualizar Producto';
            this.shadow.getElementById('cancelEditButton').style.display = 'inline-block';
        }
    }

    cancelEdit() {
        this.resetForm();
    }

    async deleteProduct(id) {
        if (!confirm('¿Está seguro de que desea eliminar este producto?')) return;

        try {
            const response = await fetch(`/api/minibar/products/${id}`, { method: 'DELETE' });
            if (response.ok) {
                this.showMessage('Producto eliminado exitosamente.', 'success');
                this.fetchProducts();
            } else {
                const errorData = await response.json();
                this.showMessage(`Error: ${errorData.error}`, 'error');
            }
        } catch (error) {
            console.error('Error deleting minibar product:', error);
            this.showMessage('Error de conexión al eliminar producto.', 'error');
        }
    }

    resetForm() {
        this.editingProduct = null;
        this.shadow.getElementById('productForm').reset();
        this.shadow.getElementById('saveProductButton').textContent = 'Añadir Producto';
        this.shadow.getElementById('cancelEditButton').style.display = 'none';
        this.hideMessage();
    }

    showMessage(message, type) {
        const messageArea = this.shadow.getElementById('messageArea');
        messageArea.textContent = message;
        messageArea.className = `message ${type}`;
        messageArea.style.display = 'block';
        setTimeout(() => this.hideMessage(), 3000);
    }

    hideMessage() {
        this.shadow.getElementById('messageArea').style.display = 'none';
    }
}

customElements.define('minibar-dashboard', MinibarDashboard);
