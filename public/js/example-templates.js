/**
 * UML AI - Example Templates
 * Pre-built example prompts for each diagram type
 */

const EXAMPLE_TEMPLATES = {
    class: [
        {
            title: "E-Commerce System",
            prompt: `Create a class diagram for an e-commerce system with the following:
- User class with name, email, and address attributes
- Product class with name, price, and description
- Order class with orderDate, status, and totalAmount
- OrderItem class linking Order to Product with quantity
- User places many Orders, each Order has many OrderItems
- Product can be in many OrderItems`
        },
        {
            title: "Library Management",
            prompt: `Design a class diagram for a library system:
- Book with ISBN, title, author, and availability status
- Member with memberId, name, and borrowing limit
- Loan record tracking which member borrowed which book and when
- LibraryCard associated with each Member
- Members can have multiple active Loans`
        }
    ],
    sequence: [
        {
            title: "User Login Flow",
            prompt: `Create a sequence diagram for user authentication:
- User enters credentials in LoginForm
- LoginForm sends credentials to AuthService
- AuthService validates against UserDatabase
- On success: Database returns user data, AuthService creates JWT token, returns to LoginForm, redirects to Dashboard
- On failure: Database returns error, AuthService sends error message back to LoginForm`
        },
        {
            title: "Online Payment",
            prompt: `Design a sequence diagram for processing a payment:
- Customer initiates payment on CheckoutPage
- CheckoutPage sends payment details to PaymentGateway
- PaymentGateway validates card with BankAPI
- BankAPI returns authorization code
- PaymentGateway creates transaction record in TransactionDB
- Success confirmation sent back to Customer`
        }
    ],
    state: [
        {
            title: "Order Lifecycle",
            prompt: `Create a state machine for an order:
- Initial state: Created
- States: Created, Pending Payment, Paid, Processing, Shipped, Delivered, Cancelled
- Transitions: pay() from Created to Paid, process() from Paid to Processing, ship() from Processing to Shipped, deliver() from Shipped to Delivered
- Can cancel from Created or Pending Payment states only`
        },
        {
            title: "Bug Tracking",
            prompt: `Design a state diagram for a bug/issue tracker:
- States: New, Assigned, In Progress, Under Review, Resolved, Closed, Reopened
- New bug can be Assigned to developer
- Assigned becomes In Progress when work starts
- In Progress moves to Under Review when done
- Review can result in Resolved or back to In Progress
- Resolved can be Closed or Reopened`
        }
    ],
    activity: [
        {
            title: "User Registration",
            prompt: `Create an activity diagram for user registration:
- Start with user clicking Register
- Fill registration form
- Decision: validate email format - if invalid, show error and return to form
- Check if email already exists in database
- If exists: show error, else create account
- Send verification email
- User clicks verification link
- Activate account
- Redirect to login page - End`
        },
        {
            title: "Order Checkout",
            prompt: `Design an activity diagram for e-commerce checkout:
- Start at shopping cart
- Verify items in stock (fork to check multiple items in parallel)
- Join results
- Decision: all items available?
- Yes: proceed to shipping info
- No: show unavailable items, return to cart
- Enter shipping address
- Select shipping method
- Enter payment details
- Process payment
- Decision: payment successful?
- Yes: create order, send confirmation email, end
- No: show error, return to payment`
        }
    ],
    component: [
        {
            title: "Web Application",
            prompt: `Create a component diagram for a typical web application:
- Frontend component (React/Vue) requires AuthAPI and DataAPI interfaces
- API Gateway component provides AuthAPI and DataAPI, requires DatabaseService and CacheService
- Authentication Service component provides authentication logic
- Database component (PostgreSQL) provides DatabaseService
- Redis Cache component provides CacheService
- Show dependencies between components`
        },
        {
            title: "Microservices",
            prompt: `Design a component diagram for a microservices architecture:
- User Service provides user management API
- Order Service provides order API, requires UserService and InventoryService
- Inventory Service provides inventory API
- Payment Service provides payment processing, requires OrderService
- Notification Service requires all services for sending alerts
- API Gateway component routes requests to all services
- Message Queue component for async communication`
        }
    ],
    deployment: [
        {
            title: "Cloud Architecture",
            prompt: `Create a deployment diagram for AWS cloud deployment:
- Load Balancer node containing HAProxy
- Two Web Server nodes each containing Nginx and Node.js Application
- Database Server node with PostgreSQL primary and replica
- Cache Server node with Redis
- File Storage node with S3 artifacts
- Show communication paths with protocols (HTTPS, TCP)`
        },
        {
            title: "Kubernetes Cluster",
            prompt: `Design a deployment diagram for a Kubernetes deployment:
- Master Node containing API Server, Scheduler, Controller Manager
- Worker Node 1 with Pod containing frontend container and sidecar
- Worker Node 2 with Pod containing backend API containers
- Worker Node 3 with Pod containing database container
- Ingress Controller on edge
- Persistent Volume for database storage
- Show service mesh connections`
        }
    ],
    package: [
        {
            title: "MVC Architecture",
            prompt: `Create a package diagram for an MVC application:
- presentation package containing Views and Controllers
- business package containing Services and DTOs
- data package containing Repositories and Entities
- common package containing Utilities and Constants
- presentation depends on business
- business depends on data and common
- data depends on common`
        },
        {
            title: "Layered Architecture",
            prompt: `Design a package diagram for a layered architecture:
- UI layer package with Web and Mobile sub-packages
- Application layer with Commands and Queries packages
- Domain layer with Entities, ValueObjects, and DomainServices
- Infrastructure layer with Persistence, External APIs, and Messaging
- Show proper dependency flow: UI -> Application -> Domain <- Infrastructure`
        }
    ],
    er: [
        {
            title: "Social Media Database",
            prompt: `Create an ER diagram for a social media platform:
- User entity with id (PK), username, email, created_at
- Post entity with id (PK), user_id (FK), content, created_at
- Comment entity with id (PK), post_id (FK), user_id (FK), text
- Like entity with id (PK), post_id (FK), user_id (FK)
- Follow relationship between users (follower_id, following_id)
- User has many Posts (1:N)
- Post has many Comments and Likes (1:N)
- Users can follow many Users (M:N)`
        },
        {
            title: "E-Commerce Database",
            prompt: `Design an ER diagram for an online store:
- Customer with customer_id (PK), name, email, address
- Product with product_id (PK), name, price, stock_quantity, category_id (FK)
- Category with category_id (PK), name, parent_category_id (FK nullable)
- Order with order_id (PK), customer_id (FK), order_date, status, total
- OrderItem with item_id (PK), order_id (FK), product_id (FK), quantity, price
- Customer places many Orders (1:N)
- Order contains many OrderItems (1:N)
- Product belongs to one Category, Category can have sub-categories`
        }
    ]
};

/**
 * Get all examples for a specific diagram type
 */
function getExamplesForType(diagramType) {
    return EXAMPLE_TEMPLATES[diagramType] || [];
}

/**
 * Get all diagram types that have examples
 */
function getAvailableDiagramTypes() {
    return Object.keys(EXAMPLE_TEMPLATES);
}

/**
 * Get a flat list of all examples with their diagram types
 */
function getAllExamples() {
    const allExamples = [];
    for (const [type, examples] of Object.entries(EXAMPLE_TEMPLATES)) {
        for (const example of examples) {
            allExamples.push({
                type,
                ...example
            });
        }
    }
    return allExamples;
}

// Export for use in app.js
window.ExampleTemplates = {
    EXAMPLE_TEMPLATES,
    getExamplesForType,
    getAvailableDiagramTypes,
    getAllExamples
};
