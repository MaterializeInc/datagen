# Kubernetes Example

This example demonstrates how to deploy the datagen tool to Kubernetes alongside a Redpanda Kafka cluster.

## Overview

The example includes:
- A single-node Redpanda deployment for Kafka
- A datagen deployment that produces data to Redpanda
- ConfigMap to store the datagen schema
- Associated Kubernetes services

## Prerequisites

- A Kubernetes cluster
- `kubectl` configured to interact with your cluster
- Basic understanding of Kubernetes concepts (Deployments, Services, ConfigMaps)

## Setup

1. First, create a namespace for our resources (if not already exists):

```bash
kubectl create namespace materialize
```

2. Apply the Kubernetes manifests, which will create the datagen and Redpanda deployments:

```bash
kubectl apply -f examples/kubernetes/datagen.yaml
kubectl apply -f examples/kubernetes/redpanda.yaml
```

## Manifest Details

The deployment consists of several Kubernetes resources. Let's examine each one:

### 1. Schema ConfigMap

This ConfigMap stores the schema definition that datagen will use to generate data:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: datagen-schema
  namespace: materialize
data:
  schema.json: |
    [
        {
            "_meta": {
                "topic": "mz_datagen_test"
            },
            "id": "iteration.index",
            "name": "faker.internet.userName()"
        }
    ]
```

You can customize the schema to generate different data. For more information, see the datagen [README](../../README.md) file.

### 2. Datagen Deployment

The datagen deployment uses the official `materialize/datagen` image and mounts the schema `ConfigMap`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: datagen
  namespace: materialize
spec:
  replicas: 1
  selector:
    matchLabels:
      app: datagen
  template:
    metadata:
      labels:
        app: datagen
    spec:
      containers:
        - name: datagen
          image: materialize/datagen:latest
          args:
            [
              "datagen",
              "-s", "/schemas/schema.json",
              "-f", "json",
              "-n", "10024",
              "-w", "2000",
              "-d"
            ]
          env:
            - name: KAFKA_BROKERS
              value: "redpanda.materialize.svc.cluster.local:9092"
          volumeMounts:
            - name: datagen-schema-volume
              mountPath: /schemas
              readOnly: true
      volumes:
        - name: datagen-schema-volume
          configMap:
            name: datagen-schema
```

### 3. Redpanda Deployment and Service

The Redpanda deployment provides a Kafka-compatible message broker:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redpanda
  namespace: materialize
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redpanda
  template:
    metadata:
      labels:
        app: redpanda
    spec:
      containers:
        - name: redpanda
          image: docker.vectorized.io/vectorized/redpanda:v23.3.5
          command: ["/usr/bin/rpk"]
          args: [
            "redpanda",
            "start",
            "--overprovisioned",
            "--smp", "1",
            "--memory", "1G",
            "--reserve-memory", "0M",
            "--node-id", "0",
            "--check=false",
            "--kafka-addr", "0.0.0.0:9092",
            "--advertise-kafka-addr", "redpanda.materialize.svc.cluster.local:9092",
            "--pandaproxy-addr", "0.0.0.0:8082",
            "--advertise-pandaproxy-addr", "redpanda.materialize.svc.cluster.local:8082",
            "--set", "redpanda.enable_transactions=true",
            "--set", "redpanda.enable_idempotence=true",
            "--set", "redpanda.auto_create_topics_enabled=true",
            "--set", "redpanda.default_topic_partitions=1"
          ]
          ports:
            - containerPort: 9092
            - containerPort: 8081
            - containerPort: 8082
          livenessProbe:
            httpGet:
              path: /v1/status/ready
              port: 9644
            initialDelaySeconds: 30
            periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: redpanda
  namespace: materialize
spec:
  selector:
    app: redpanda
  ports:
    - name: kafka
      protocol: TCP
      port: 9092
      targetPort: 9092
    - name: pandaproxy
      protocol: TCP
      port: 8082
      targetPort: 8082
```

## Verifying the Deployment

1. Check if the pods are running:

```bash
kubectl get pods -n materialize
```

2. View datagen logs:

```bash
kubectl logs -f deployment/datagen -n materialize
```

3. View Redpanda logs:

```bash
kubectl logs -f deployment/redpanda -n materialize
```

## Scaling

You can scale the datagen deployment to produce more data in parallel:

```bash
kubectl scale deployment datagen -n materialize --replicas=3
```

## Cleanup

To remove all resources:

```bash
kubectl delete namespace materialize
```

## Useful Links

- [Materialize documentation](https://materialize.com/docs/)
- [Materialize community Slack](https://materialize.com/s/chat)
- [Materialize Blog](https://materialize.com/blog/)
- [Kubernetes documentation](https://kubernetes.io/docs/home/)
