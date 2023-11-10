const fs = require('fs');

const datasetFile = './website/data/dataset.json';
const securityHeader = {
    headers: {
        'Authorization': 'Bearer ' + process.env.TOKEN
    }
};
const orgMembers = 'https://api.github.com/orgs/codecentric/members';

async function githubApi(input, headers) {
    let result = [];
    let page = 1;
    let perPage = 100;
    while (perPage === 100) {
        const response = await fetch(input + '?per_page=100&page=' + page, headers);
        const json = await response.json();
        perPage = json.length;
        result.push(json);
        page++;
    }
    return result.flat();
}

async function collectData() {
    let result = [];
    try {
        const members = await githubApi(orgMembers, securityHeader);
        for (let i in members) {
            /*if (i > 1) {
                break;
            }*/
            const allRepos = await githubApi(members[i].repos_url, securityHeader);
            const selectedRepos = allRepos.filter(value => value.fork === false);
            const languageTotals = new Map();
            let reposCount = 0;
            for (let j in selectedRepos) {
                reposCount++;
                const languages = await githubApi(selectedRepos[j].languages_url, securityHeader);
                for (const [lang, count] of Object.entries(languages[0])) {
                    languageTotals.set(lang, (languageTotals.get(lang) ?? 0) + 1);
                }
            }

            result.push({
                login: members[i].login,
                reposCount: reposCount,
                languageTotals: Object.fromEntries(languageTotals)
            });
            process.stdout.write('.');
        }

        const dataset = JSON.stringify(result, null, 2);

        fs.writeFile(datasetFile, dataset, err => {
            if (err) {
                console.log('Error writing file', err);
            } else {
                console.log('Successfully wrote dataset file', datasetFile);
            }
        });

    } catch (error) {
        console.error(error);
    }
}

collectData();
