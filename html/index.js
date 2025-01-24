
    let lastSubmittedData = null;
    let isSubmitting = false;
    
    function showForm(formId) {
        document.getElementById('basicForm').classList.add('hidden');
        document.getElementById('fullForm').classList.add('hidden');
        document.getElementById(formId).classList.remove('hidden');
    }
    
    async function submitForm(formId) {
        const form = document.getElementById(formId);
        const formData = new FormData(form);
    
        const data = {};
        formData.forEach((value, key) => {
            data[key] = Number(value);
        });
    
        console.log("Form Data:", data);
    
        try{
        const apiUrl =
        formId === "basicForm"? "http://127.0.0.1:3000/predict/diabetes": "http://127.0.0.1:3000/predict/heart";
    
          const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
    });
    
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
    
            const result = await response.json();
            console.log("Response from server:", result);
    
            if (result.prediction !== undefined) {
                const predictionResult = document.getElementById('predictionResult');
                const predictionText = document.getElementById('predictionText');
    
                predictionResult.style.display = 'none';
    
                console.log("Prediction Value:", result.prediction);
    
                if (hasDataChanged(data, result.prediction)) {
                    if (!isSubmitting) {
                        isSubmitting = true;
    
                        document.getElementById('loadingIndicator').style.display = 'block';

                        await storePredictionOnBlockchain(data, result.prediction, formId);
    
                        document.getElementById('loadingIndicator').style.display = 'none';
    
                        predictionText.textContent = result.prediction === 1
                            ? 'Patient has diabetes'
                            : 'Patient is healthy';
                        predictionResult.style.display = 'block';
    
                        console.log("Prediction stored on blockchain.");
                    } else {
                        alert("Submission already in progress, please wait.");
                    }
                } else {
                    alert("No change in data, not submitting to blockchain.");
                }
            } else {
                alert(`Error: ${result.error}`);
            }
        } catch (error) {
            console.error("Error while submitting form:", error);
            alert('Failed to submit the form. Please try again.');
        } finally {
            isSubmitting = false;
        }
    }
    
    function hasDataChanged(currentData, prediction) {
        const currentDataWithPrediction = { ...currentData, prediction };
        if (!lastSubmittedData) {
            return true;
        }
    
        for (const key in currentDataWithPrediction) {
            if (currentDataWithPrediction[key] !== lastSubmittedData[key]) {
                return true;
            }
        }
    
        return false;
    }
    
    async function storePredictionOnBlockchain(formData, prediction, formid) {
        try {
            console.log("Storing data on blockchain...");
    
            const dataToStore = { ...formData, prediction };
            console.log("Data being stored on blockchain:", dataToStore);

            const blockchainUrl =
        formid === "basicForm"? "http://localhost:3000/api/blockchain/store-diabetes": "http://localhost:3000/api/blockchain/store-heart";
    
            const blockchainResponse = await fetch(blockchainUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify([dataToStore]),
            });
    
            if (blockchainResponse.ok) {
                console.log("Blockchain API response status:", blockchainResponse.status);
                const blockchainResult = await blockchainResponse.json();
                console.log("Data stored successfully on the blockchain:", blockchainResult);
    
                lastSubmittedData = dataToStore;
            } else {
                throw new Error('Failed to store data on the blockchain.');
            }
        } catch (error) {
            console.error("Error storing data on the blockchain:", error);
            console.log('Failed to store data on the blockchain. Please try again.');
        } finally {
            isSubmitting = false;
        }
    }