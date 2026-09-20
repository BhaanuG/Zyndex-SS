## **Use Case**



The company ScholarSphere Digital requires an online publishing and access control platform to deliver digital books, academic journals, and research documents to subscription-based users. ScholarSphere must enforce granular digital rights, track reading history and engagement metrics, and prevent unauthorized content downloads or access breaches. The company requires a microservices architecture that isolates content cataloging, permission entitlement management, and usage metrics logging. ScholarSphere specifies JWT endpoint protection, API Gateway routing, and Eureka service discovery to load-balance continuous content streams and

reading traffic smoothly. 



### The system should: 



* Control access to digital content  
* Track usage and reading history  
* Prevent unauthorized access 
* Microservices 
* Content Service  
* Access Service  
* Usage Service (+ API Gateway, Auth Service, Eureka Server)



### Tasks to be Done 



* Implement JWT authentication  
* Content Service manages digital resources  
* Access Service controls permissions  
* Usage Service tracks reading activity  
* Inter-service communication (Access -> Content -> Usage)  
* Register with Eureka  
* Route via API Gateway  
* Enable Load Balancing  
* Perform Unit \& Integration Testing  
* Deploy system

